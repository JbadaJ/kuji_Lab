# kuji Lab

일본 일번쿠지(一番くじ) 상품 탐색 및 뽑기 시뮬레이터 웹앱.

- **상품 검색/탐색** — 2,500개+ 쿠지 상품 퍼지 검색 및 필터
- **솔로 시뮬레이터** — 티켓 풀 기반 뽑기 시뮬레이션, URL 공유
- **룸 모드** — 실시간 멀티플레이어 뽑기 (WebSocket)

---

## 프로젝트 구조

```
kuji_Lab/
├── kuji-lab/          # Next.js 프론트엔드
│   ├── app/           # App Router 페이지 및 컴포넌트
│   ├── data/          # kuji_all_products.json (상품 데이터)
│   ├── scripts/       # 데이터 스크래핑 스크립트
│   └── types/         # TypeScript 타입 정의
└── kuji-server/       # FastAPI 룸 서버
```

---

## 1. 프론트엔드 (kuji-lab)

### 요구사항

- Node.js 20+
- npm

### 설치 및 실행

```bash
cd kuji-lab
npm install
npm run dev      # http://localhost:3000
```

### 환경 변수

`kuji-lab/.env.local` 파일을 생성하고 아래 값을 채워넣으세요.

```env
# 어드민 패널 로그인
ADMIN_ID=your_admin_id
ADMIN_PASSWORD=your_admin_password

# Auth.js v5 (필수)
AUTH_SECRET=your_random_secret_string   # openssl rand -base64 32

# OAuth 프로바이더 (사용할 것만 설정)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# 룸 모드 (kuji-server 주소)
NEXT_PUBLIC_ROOM_SERVER_URL=http://localhost:8000
ROOM_TOKEN_SECRET=same_secret_as_kuji_server
```

### 주요 명령어

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 (빌드 후)
npm run lint     # ESLint
```

---

## 2. 룸 서버 (kuji-server)

WebSocket 기반 멀티플레이어 룸을 처리하는 FastAPI 서버입니다.  
**룸 모드를 사용하지 않는다면 이 서버는 필요 없습니다.**

### 요구사항

- Python 3.12+
- Redis (로컬 또는 Upstash 등 외부 서비스)

### 설치 및 실행

```bash
cd kuji-server

# 가상환경 생성 (선택)
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 환경 변수

`kuji-server/.env` 파일을 생성하세요.

```env
REDIS_URL=redis://localhost:6379
ROOM_TOKEN_SECRET=same_secret_as_frontend
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 3. 데이터 스크래퍼 (scripts)

어드민 패널에서 "업데이트 시작" 버튼을 누르면 실행되는 스크립트입니다.  
1kuji.com에서 신규 상품을 스크랩하여 `data/kuji_all_products.json`에 추가합니다.

### 요구사항

```bash
cd kuji-lab
pip install -r scripts/requirements.txt
python -m playwright install chromium
```

### 수동 실행

```bash
cd kuji-lab
python scripts/update_kuji.py
```

---

## 배포

| 서비스 | 플랫폼 |
|--------|--------|
| 프론트엔드 | Vercel |
| 룸 서버 | Railway (Dockerfile 포함) |
| Redis | Upstash (Railway 플러그인) |

### Railway 배포 (kuji-server)

`kuji-server/` 디렉토리를 Railway 프로젝트로 연결하면 `railway.toml`과 `Dockerfile`을 자동으로 감지합니다.  
Railway 환경 변수에 `REDIS_URL`, `ROOM_TOKEN_SECRET`, `ALLOWED_ORIGINS`를 설정하세요.

---

## 데이터 출처

상품 데이터는 [1kuji.com](https://1kuji.com) (BANDAI SPIRITS 공식 사이트)에서 스크랩했습니다.
