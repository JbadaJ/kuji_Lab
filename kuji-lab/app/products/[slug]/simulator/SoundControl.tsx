'use client'

import { useState } from 'react'
import { useLanguage } from '@/app/contexts/LanguageContext'
import { getSoundSettings, setSoundVolume, setSoundMuted } from './sound'

export default function SoundControl() {
  const { t } = useLanguage()
  const [settings, setSettings] = useState(() => getSoundSettings())

  const toggleMute = () => {
    const muted = !settings.muted
    setSoundMuted(muted)
    setSettings(s => ({ ...s, muted }))
  }

  const changeVolume = (volume: number) => {
    setSoundVolume(volume)
    setSettings(s => ({ ...s, volume, muted: false }))
    if (settings.muted) setSoundMuted(false)
  }

  const silent = settings.muted || settings.volume === 0

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleMute}
        aria-label={t.simulatorSoundToggle}
        title={t.simulatorSoundToggle}
        className={`transition-colors ${silent ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-white'}`}
      >
        {silent ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 9l4 6m0-6l-4 6" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" />
          </svg>
        )}
      </button>
      <input
        type="range"
        min={0}
        max={100}
        value={settings.muted ? 0 : Math.round(settings.volume * 100)}
        onChange={e => changeVolume(Number(e.target.value) / 100)}
        aria-label={t.simulatorSoundVolume}
        className="w-14 h-1 accent-orange-500 cursor-pointer hidden sm:block"
      />
    </div>
  )
}
