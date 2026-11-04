# Scroll Gallery

핀터레스트 스타일의 이미지 공유 포트폴리오 프로젝트입니다. 이미지를 올리고, 보드에 모으고, 좋아요·댓글로 소통할 수 있는 풀스택 웹 앱입니다.

- **배포 주소**: https://scrollgallery.duckdns.org
- **구성**: React(Vite) 클라이언트 + Node.js(Express) API 서버, 한 저장소(모노레포)

> 시연용 서버(Oracle Cloud Always Free)에서 운영 중이라 점검이나 인스턴스 정책에 따라 일시적으로 접속이 안 될 수 있습니다.

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| Client | React 19, Vite, React Router 7, Redux Toolkit(인증 상태), TanStack Query(서버 상태), CSS Modules |
| Server | Node.js, Express 5, MongoDB 네이티브 드라이버, JWT(access) + opaque refresh token, bcrypt, multer, sharp |
| Database | MongoDB Atlas |
| 이미지 저장 | Cloudflare R2 (S3 호환 API, `@aws-sdk/client-s3`) |
| 배포 | Oracle Cloud Always Free VM(Ubuntu 24.04), Nginx, pm2, Let's Encrypt(certbot), DuckDNS |

## 주요 기능

- **인증**: 회원가입 / 로그인 / 로그아웃 / 토큰 갱신(refresh)
- **핀**: 이미지 업로드, 목록(무한 스크롤), 상세, 수정, 삭제, 좋아요
- **보드**: 생성 / 상세 / 수정 / 삭제, 보드에 핀 저장·제거
- **댓글**: 댓글, 대댓글, 삭제
- **검색**: 핀 검색, 내 핀 검색
- **프로필**: 사용자별 보드·핀 조회

## 구조

```
브라우저 ──(HTTPS 443)──▶ Nginx ─┬─ /      → React 정적 파일(dist)
                                 └─ /api   → Node(Express, 4000번, 서버 내부 통신)
                                               ├─▶ MongoDB Atlas
                                               └─▶ Cloudflare R2 (이미지)
```

React와 API를 Nginx 한 주소에서 함께 제공합니다. refreshToken 쿠키가 `httpOnly` + `sameSite: 'strict'`라서 같은 사이트에서만 전송되기 때문입니다.

```
scroll-gallery/
├─ client/   # React + Vite
│  └─ src/ (api, components, hooks, pages, store, utils)
└─ server/   # Express API
   ├─ routes/      # auth, pins, boards, comments, users, search
   ├─ middleware/  # auth(verifyToken), upload(multer)
   └─ utils/
```

## API 개요

| 경로 | 설명 |
|---|---|
| `/api/auth` | register, login, logout, refresh |
| `/api/pins` | 핀 CRUD, 좋아요(`/:id/likes`) |
| `/api/pins/:id/comments` | 댓글, 대댓글(`/:commentId/replies`) |
| `/api/boards` | 보드 CRUD, 보드 내 핀(`/:id/pins`) |
| `/api/users` | `/:username`, 보드·핀 목록 |
| `/api/search` | `/pins`, `/my_pins` |

## 기술적 결정

- **Refresh Token**: 서버에서 즉시 폐기할 수 있도록 JWT가 아닌 `crypto.randomBytes` 기반 opaque 토큰을 DB에 저장합니다. 갱신할 때마다 기존 토큰을 삭제하고 새 토큰을 발급하며(rotation), 이미 사용된 토큰으로 요청하면 403으로 거부합니다.
- **이미지 저장소**: 비용을 고려해 S3 대신 R2를 선택했고, S3 호환 API라 기존 SDK를 그대로 사용했습니다.
- **이미지 최적화**: sharp로 리사이즈·WebP 변환한 최적화본(`optimized/`)과 원본(`originals/`)을 함께 보존합니다.
- **무한 스크롤**: 새 핀 추가 시 중복·누락이 생기고 `skip`이 커질수록 느려지는 오프셋 방식 대신 커서 기반 페이지네이션을 사용했습니다.
- **Masonry 레이아웃**: 항상 가장 짧은 컬럼에 채우는 그리디 알고리즘을 직접 구현했습니다.
- **동시 401 처리**: 여러 요청이 동시에 401을 받아도 refresh가 중복 호출되지 않도록 처리했습니다.

## 로컬 실행

사전 준비: Node.js, MongoDB Atlas 연결 문자열, Cloudflare R2 버킷

```bash
# 1) 서버
cd server
npm install
cp .env.example .env     # 값 채우기 (아래 환경변수 참고)
node index.js            # http://localhost:4000

# 2) 클라이언트 (새 터미널)
cd client
npm install
cp .env.example .env     # VITE_API_URL 확인
npm run dev              # http://localhost:5173
```

서버 CORS 허용 origin이 `http://localhost:5173`으로 고정되어 있어 개발 시 이 주소를 사용해야 합니다.

### 환경변수 (값은 저장소에 포함하지 않습니다)

| 이름 | 용도 |
|---|---|
| `MONGODB_URI` | MongoDB Atlas 연결 문자열 |
| `JWT_ACCESS_TOKEN_SECRET` | access token 서명 키 |
| `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 접근 |
| `NODE_ENV` | `production`이면 운영 모드(HTTPS 전제) |
| `VITE_API_URL` (client) | API 기본 주소. 배포 빌드는 `/api` |

## 배포 방식

1. 클라이언트를 `VITE_API_URL=/api`로 빌드해 서버에 업로드하고 Nginx가 정적 파일로 제공합니다.
2. API 서버는 pm2로 상시 실행하며 부팅 시 자동 시작됩니다.
3. Nginx가 `/api` 요청을 `127.0.0.1:4000`으로 프록시합니다. 4000번 포트는 외부에 열지 않습니다.
4. Let's Encrypt 인증서를 certbot으로 발급·자동 갱신합니다.
5. 방화벽은 OCI 보안 목록과 서버 iptables 양쪽에서 웹 트래픽(80/443)과 SSH(22)만 허용합니다.
