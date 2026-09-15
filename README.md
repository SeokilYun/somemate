# 썸메이트 (Somemate)

대화 캡처와 고민을 공유하면 성격이 다른 AI 친구 3명(낙관 / 신중 / 현실)이 각자의 관점으로 해석해주는 관계 상담 웹앱. 연애뿐 아니라 친구·동료·가족 관계도 다루는 모바일 우선 반응형 웹앱입니다.

> 현재 상태: 코드 스캐폴딩 완료, 인증(회원가입/로그인) 백엔드 구현 및 실제 서버 DB 검증 완료. 전체 요구사항은 [AGENTS.md](AGENTS.md), API 스펙은 [docs/API.md](docs/API.md) 참고.

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
- MySQL 접속 정보 (서버에 직접 구성된 인스턴스 사용, 로컬 컨테이너 없음)
- 비전 지원 LLM API 키 (제공사 미정)
- VAPID 키 쌍 (Web Push 발송용)

## 시작하기

```bash
npm install
cp .env.example .env      # 아래 환경 변수 값 채우기 (DATABASE_URL 포함)
npx prisma db push        # 스키마를 DB에 반영 (아래 참고: migrate dev 아님)
npm run dev
```

`http://localhost:3000` 접속.

> **`migrate dev`가 아닌 `db push`를 쓰는 이유**: 서버 DB 계정에 shadow database 생성 권한이 없어 `prisma migrate dev`가 동작하지 않는다(P3014). 당분간 `prisma db push`로 스키마를 직접 동기화하고, 마이그레이션 히스토리(`prisma/migrations/`)는 쌓이지 않는다. `schema.prisma`를 변경하면 반드시 `npx prisma db push`를 다시 실행해 DB에 반영할 것.

## 환경 변수

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | Prisma용 MySQL 접속 문자열 (예: `mysql://user:password@서버주소:3306/somemate`, 서버에 직접 구성된 MySQL 인스턴스) |
| `NEXTAUTH_SECRET` | NextAuth 세션 암호화 시크릿 |
| `NEXTAUTH_URL` | NextAuth 콜백 기준 URL (로컬: `http://localhost:3000`) |
| `LLM_API_KEY` | 이미지 분석 및 캐릭터 응답 생성에 사용하는 비전 지원 LLM API 키 (제공사 미정, 서버 전용, 클라이언트 노출 금지) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 발송용 키 쌍 |
| `CRON_SECRET` | 후속 알림 발송 내부 엔드포인트(`/api/internal/followups/dispatch`) 인증용 |

## 문서

- [AGENTS.md](AGENTS.md) — 기능 명세, 데이터 모델, 디자인 방향, 구현 범위 (Claude Code / Codex 공통 참조 문서. `CLAUDE.md`는 이 파일을 가져오는 얇은 포인터입니다)
- [docs/API.md](docs/API.md) — API 엔드포인트 상세 스펙
