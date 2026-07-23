# 배포 가이드

구성: **Vercel** (프론트엔드) + **Railway** (룸 서버) + **Upstash** (Redis)

배포 순서는 Redis → 룸 서버 → 프론트엔드 순이 편합니다 (앞 단계의 URL을 다음 단계 환경 변수에 넣어야 하므로).

---

## 1. Upstash Redis

1. https://upstash.com 에서 Redis 데이터베이스 생성 (리전: 일본/도쿄 권장 — 사용자와 Railway 리전에 맞춤)
2. `rediss://...` 형식의 연결 URL 복사 → Railway의 `REDIS_URL`에 사용

## 2. Railway — 룸 서버 (kuji-server)

1. https://railway.app 에서 GitHub 저장소 `JbadaJ/kuji_Lab` 연결
2. **Root Directory를 `kuji-server`로 설정** → `railway.toml`과 `Dockerfile`이 자동 감지됨
3. 환경 변수 설정:

   | 변수 | 값 |
   |------|-----|
   | `REDIS_URL` | Upstash 연결 URL (`rediss://...`) |
   | `ROOM_TOKEN_SECRET` | 랜덤 시크릿 (프론트엔드와 **동일한 값**) — `openssl rand -base64 32` |
   | `ALLOWED_ORIGINS` | `https://<프로덕션 도메인>` (쉼표로 여러 개 가능, 미리보기 도메인 포함 시 추가) |

4. 배포 후 `https://<railway-domain>/health` 가 `{"ok": true}` 를 반환하는지 확인

## 3. Vercel — 프론트엔드 (kuji-lab)

1. https://vercel.com 에서 GitHub 저장소 연결, **Root Directory를 `kuji-lab`으로 설정**
2. 환경 변수 설정 (Production):

   | 변수 | 값 |
   |------|-----|
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
   | `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub Developer Settings |
   | `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Discord Developer Portal |
   | `ADMIN_ID` / `ADMIN_PASSWORD` | 어드민 패널 로그인 정보 |
   | `NEXT_PUBLIC_ROOM_SERVER_URL` | `https://<railway-domain>` (WebSocket은 자동으로 wss 사용) |
   | `ROOM_TOKEN_SECRET` | Railway와 **동일한 값** |

3. **OAuth 리다이렉트 URI를 각 프로바이더 콘솔에 프로덕션 도메인으로 추가**:
   - Google: `https://<도메인>/api/auth/callback/google`
   - GitHub: `https://<도메인>/api/auth/callback/github`
   - Discord: `https://<도메인>/api/auth/callback/discord`

## 4. 배포 후 확인 체크리스트

- [ ] 홈 검색/필터, 상품 상세, 시뮬레이터 동작
- [ ] OAuth 3종 로그인 (프로덕션 도메인에서)
- [ ] 룸 생성 → 다른 브라우저/기기로 참가 → 실시간 뽑기 동기화
- [ ] 다크 모드 / 언어 전환 (ko/ja/en)
- [ ] `/admin` 접근 시 로그인 요구 (`proxy.ts` 가드)

## 주의: 프로덕션에서 어드민 "업데이트 시작" 버튼

`/api/update`는 로컬 Python 프로세스(`scripts/update_kuji.py`)를 실행하는 구조라서 **Vercel 서버리스에서는 동작하지 않습니다.**

프로덕션 데이터 갱신은 GitHub Actions로 대체되어 있습니다:

- `.github/workflows/update-data.yml` — 매주 화요일 자동 실행 (수동 실행: Actions 탭 → "Update kuji data" → Run workflow)
- 스크랩 → `kuji-lab/data/` 커밋/푸시 → Vercel이 자동 재배포

로컬에서 `npm run dev`로 띄운 경우에는 어드민 버튼이 기존대로 동작합니다.
