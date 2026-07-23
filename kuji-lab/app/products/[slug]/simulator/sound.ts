import type { EffectProfile } from './effects'

// ── Sound engine ────────────────────────────────────────────────────────────
//
// 공유 AudioContext 하나에 마스터 게인(볼륨/음소거)과 리버브 버스를 연결한
// 작은 신디사이저. 오디오 파일 없이 모든 효과음을 실시간 합성한다.
//
//   note()       — 배음이 섞인 톤 (본음 + 옥타브 위 하모닉)
//   noiseBurst() — 필터링된 화이트 노이즈 (티켓 찢는 소리, 심벌 등)
//   riser        — 드래그 진행도를 따라 올라가는 긴장감 사운드
//
// 볼륨/음소거 설정은 localStorage에 저장되어 세션 간 유지된다.

const STORAGE_KEY = 'kuji-sound'

export interface SoundSettings {
  volume: number   // 0..1
  muted: boolean
}

let _settings: SoundSettings | null = null
let _ctx: AudioContext | null = null
let _master: GainNode | null = null
let _reverbSend: GainNode | null = null

function loadSettings(): SoundSettings {
  if (_settings) return _settings
  const s: SoundSettings = { volume: 0.8, muted: false }
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SoundSettings>
        if (typeof parsed.volume === 'number') s.volume = Math.max(0, Math.min(1, parsed.volume))
        if (typeof parsed.muted === 'boolean') s.muted = parsed.muted
      }
    } catch { /* corrupted settings → defaults */ }
  }
  _settings = s
  return s
}

function persistSettings() {
  if (!_settings || typeof window === 'undefined') return
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(_settings)) } catch { /* quota */ }
}

function applyMasterGain() {
  if (!_master || !_ctx) return
  const s = loadSettings()
  _master.gain.setTargetAtTime(s.muted ? 0 : s.volume, _ctx.currentTime, 0.02)
}

export function getSoundSettings(): SoundSettings {
  return { ...loadSettings() }
}

export function setSoundVolume(volume: number) {
  const s = loadSettings()
  s.volume = Math.max(0, Math.min(1, volume))
  persistSettings()
  applyMasterGain()
}

export function setSoundMuted(muted: boolean) {
  const s = loadSettings()
  s.muted = muted
  persistSettings()
  applyMasterGain()
}

/** 잔향용 임펄스 응답 — 지수 감쇠하는 노이즈 */
function makeImpulse(ctx: AudioContext, duration = 1.3, decay = 3.5): AudioBuffer {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * duration)
  const buf = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  return buf
}

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      _ctx = new Ctx()

      _master = _ctx.createGain()
      _master.connect(_ctx.destination)

      const convolver = _ctx.createConvolver()
      convolver.buffer = makeImpulse(_ctx)
      _reverbSend = _ctx.createGain()
      _reverbSend.gain.value = 0.22
      _reverbSend.connect(convolver)
      convolver.connect(_master)

      applyMasterGain()
    }
    if (_ctx.state === 'suspended') void _ctx.resume()
    return _ctx
  } catch {
    return null
  }
}

/** 본음 + 한 옥타브 위 하모닉을 겹친 톤. reverb 비율만큼 잔향 버스로도 보낸다. */
function note(
  ctx: AudioContext, freq: number, start: number, dur: number, vol: number,
  opts: { type?: OscillatorType; freqEnd?: number; harmonic?: number; reverb?: number } = {}
) {
  if (!_master || !_reverbSend) return
  const { type = 'sine', freqEnd, harmonic = 0.35, reverb = 0.5 } = opts

  const gain = ctx.createGain()
  gain.connect(_master)
  const send = ctx.createGain()
  send.gain.value = reverb
  gain.connect(send)
  send.connect(_reverbSend)

  const layers: Array<[number, number, OscillatorType]> = [[freq, 1, type]]
  if (harmonic > 0) layers.push([freq * 2, harmonic, 'sine'])

  for (const [f, mul, t] of layers) {
    const osc = ctx.createOscillator()
    osc.type = t
    osc.frequency.setValueAtTime(f, start)
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd * (f / freq), start + dur)
    const og = ctx.createGain()
    og.gain.value = mul
    osc.connect(og); og.connect(gain)
    osc.start(start); osc.stop(start + dur + 0.02)
  }

  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(vol, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
}

/** 필터를 거친 화이트 노이즈 — 찢는 소리, 반짝임, 심벌 */
function noiseBurst(
  ctx: AudioContext, start: number, dur: number, vol: number,
  opts: { filter?: BiquadFilterType; freq?: number; freqEnd?: number; q?: number } = {}
) {
  if (!_master) return
  const { filter = 'bandpass', freq = 2000, freqEnd, q = 0.8 } = opts

  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, Math.max(1, len), ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buf
  const biq = ctx.createBiquadFilter()
  biq.type = filter
  biq.frequency.setValueAtTime(freq, start)
  if (freqEnd) biq.frequency.exponentialRampToValueAtTime(freqEnd, start + dur)
  biq.Q.value = q
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)

  src.connect(biq); biq.connect(gain); gain.connect(_master)
  src.start(start); src.stop(start + dur + 0.02)
}

// ── Reveal sounds — 티어가 높을수록 빠르고 경쾌하게 ──────────────────────────

export function playRevealSound(profile: EffectProfile) {
  const ctx = ensureCtx()
  if (!ctx) return
  const now = ctx.currentTime

  // 공통: 티켓을 여는 "찌익" 노이즈
  noiseBurst(ctx, now, 0.13, 0.18, { filter: 'bandpass', freq: 1200, freqEnd: 3200, q: 0.6 })

  const t0 = now + 0.1  // 멜로디는 찢는 소리 직후 시작

  if (profile.isRainbow) {
    // 티어 4 — 풀 팡파레 + 베이스 + 심벌
    const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1568.00]
    const harmony = [392.00, 493.88, 587.33, 783.99]
    fanfare.forEach((f, i) => note(ctx, f, t0 + i * 0.08, 0.65, 0.3, { reverb: 0.7 }))
    harmony.forEach((f, i) => note(ctx, f, t0 + i * 0.08 + 0.04, 0.5, 0.13, { reverb: 0.7 }))
    note(ctx, 130.81, t0, 0.9, 0.22, { type: 'triangle', harmonic: 0.2 })          // 베이스
    note(ctx, 2093, t0 + 0.45, 0.9, 0.15, { reverb: 0.9 })
    note(ctx, 2637, t0 + 0.6, 0.8, 0.1, { reverb: 0.9 })
    noiseBurst(ctx, t0 + 0.4, 0.8, 0.1, { filter: 'highpass', freq: 6000 })        // 심벌
  } else if (profile.tier === 3) {
    // 빠른 5음 상승 런 + 코드 히트 + 차임
    const run = [523.25, 587.33, 659.25, 783.99, 1046.50]
    run.forEach((f, i) => note(ctx, f, t0 + i * 0.07, 0.4, 0.24, { reverb: 0.6 }))
    const chord = [523.25, 659.25, 783.99]
    chord.forEach(f => note(ctx, f, t0 + 0.38, 0.55, 0.16, { reverb: 0.7 }))
    note(ctx, 2093, t0 + 0.5, 0.7, 0.12, { reverb: 0.9 })
    noiseBurst(ctx, t0 + 0.35, 0.5, 0.06, { filter: 'highpass', freq: 7000 })
  } else if (profile.tier === 2) {
    // 밝은 4음 아르페지오 + 차임
    const arp = [523.25, 659.25, 783.99, 1046.50]
    arp.forEach((f, i) => note(ctx, f, t0 + i * 0.1, 0.45, 0.24, { reverb: 0.55 }))
    note(ctx, 1568, t0 + 0.42, 0.55, 0.11, { reverb: 0.8 })
  } else if (profile.tier === 1) {
    // 경쾌한 2음 상승 + 반짝임
    note(ctx, 523.25, t0, 0.18, 0.26)
    note(ctx, 783.99, t0 + 0.11, 0.32, 0.22, { reverb: 0.5 })
    noiseBurst(ctx, t0 + 0.15, 0.25, 0.05, { filter: 'highpass', freq: 8000 })
  } else {
    // 기본 팝
    note(ctx, 700, t0, 0.16, 0.26, { freqEnd: 300, harmonic: 0.2, reverb: 0.25 })
    note(ctx, 1100, t0 + 0.01, 0.07, 0.12, { reverb: 0.2 })
  }

  // 숨은 레어 — "어?" 하는 서프라이즈 상승 글리산도 + 트윙클
  if (profile.isHiddenGem && !profile.isRainbow) {
    note(ctx, 880, t0 + 0.32, 0.35, 0.15, { freqEnd: 1760, reverb: 0.7 })
    note(ctx, 1568, t0 + 0.56, 0.4, 0.11, { reverb: 0.85 })
    note(ctx, 2093, t0 + 0.68, 0.5, 0.09, { reverb: 0.9 })
  }
}

// ── Drag riser — 드래그 진행도에 따라 올라가는 긴장감 ───────────────────────

let _riser: { osc: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null

export function startRiser() {
  const ctx = ensureCtx()
  if (!ctx || !_master || _riser) return
  try {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 90
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 250
    filter.Q.value = 4
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(filter); filter.connect(gain); gain.connect(_master)
    osc.start()
    _riser = { osc, filter, gain }
  } catch { /* ignore */ }
}

export function updateRiser(progress: number) {
  if (!_riser || !_ctx) return
  const p = Math.max(0, Math.min(1, progress))
  const t = _ctx.currentTime
  _riser.osc.frequency.setTargetAtTime(90 + p * 240, t, 0.03)
  _riser.filter.frequency.setTargetAtTime(250 + p * 2200, t, 0.03)
  _riser.gain.gain.setTargetAtTime(p * 0.075, t, 0.05)
}

export function stopRiser() {
  if (!_riser || !_ctx) { _riser = null; return }
  const { osc, gain } = _riser
  _riser = null
  try {
    const t = _ctx.currentTime
    gain.gain.setTargetAtTime(0, t, 0.04)
    osc.stop(t + 0.25)
  } catch { /* already stopped */ }
}

// ── Auto-draw — 짧은 틱, 티어 2+만 풀 사운드 ────────────────────────────────

export function playAutoDrawSound(profile: EffectProfile) {
  if (profile.tier >= 2) {
    playRevealSound(profile)
    return
  }
  const ctx = ensureCtx()
  if (!ctx) return
  const now = ctx.currentTime
  note(ctx, 880, now, 0.05, 0.09, { harmonic: 0, reverb: 0 })
  noiseBurst(ctx, now, 0.03, 0.05, { filter: 'highpass', freq: 5000 })
}
