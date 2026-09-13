# 썸메이트 (Somemate)

대화 캡처와 고민을 공유하면 성격이 다른 AI 친구 3명(낙관 / 신중 / 현실)이 각자의 관점으로 해석해주는 관계 상담 웹앱. 연애뿐 아니라 친구·동료·가족 관계도 다루는 모바일 우선 반응형 웹앱입니다.

> 현재 상태: 기획/스펙 정의 단계. 코드 스캐폴딩은 아직 진행 전입니다. 전체 요구사항은 [AGENTS.md](AGENTS.md), API 스펙은 [docs/API.md](docs/API.md) 참고.

## 기술 스택

Next.js 프로젝트 하나(App Router)에서 클라이언트와 서버(API Routes)를 함께 구성합니다. 별도 리포/배포 단위가 아니라 실행 위치 기준의 구분입니다.

**클라이언트 (App)**
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Service Worker (Web Push 구독/수신)

**서버 (API Routes)**
- NextAuth (Credentials Provider)
- Prisma + MySQL
- 비전(vision) 지원 LLM API (이미지 분석 및 캐릭터 응답 생성, 제공사 미정, 서버에서만 호출)
- Web Push (VAPID) 발송

## 사전 준비물

- Node.js 20 LTS 이상
- MySQL (로컬은 Docker 권장)
- 비전 지원 LLM API 키 (제공사 미정)
- VAPID 키 쌍 (Web Push 발송용)

## 시작하기

```bash
docker compose up -d db   # 로컬 MySQL 컨테이너 실행
npm install
cp .env.example .env      # 아래 환경 변수 값 채우기
npx prisma migrate dev
npm run dev
```

`http://localhost:3000` 접속.

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | Prisma용 MySQL 접속 문자열 (예: `mysql://user:password@localhost:3306/somemate`) |
| `NEXTAUTH_SECRET` | NextAuth 세션 암호화 시크릿 |
| `LLM_API_KEY` | 이미지 분석 및 캐릭터 응답 생성에 사용하는 비전 지원 LLM API 키 (제공사 미정, 서버 전용, 클라이언트 노출 금지) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 발송용 키 쌍 |
| `CRON_SECRET` | 후속 알림 발송 내부 엔드포인트(`/api/internal/followups/dispatch`) 인증용 |

## 문서

- [AGENTS.md](AGENTS.md) — 기능 명세, 데이터 모델, 디자인 방향, 구현 범위 (Claude Code / Codex 공통 참조 문서. `CLAUDE.md`는 이 파일을 가져오는 얇은 포인터입니다)
- [docs/API.md](docs/API.md) — API 엔드포인트 상세 스펙
