# C 담당 작업 계획서 — 서비스 기반·운영

> 이 문서는 C(서비스 기반·운영 담당)의 개인 작업 계획이다. 공통 기획/스펙은 [AGENTS.md](../../AGENTS.md), API 상세는 [docs/API.md](../API.md)를 따르며, 이 문서는 그 범위를 어떤 순서·구조로 구현할지만 다룬다.

## 1. 책임 범위 (AGENTS.md 기준)

- 실제 회원가입·로그인 처리 (NextAuth Credentials + bcrypt, 세션 유지)
- Partner/Conversation/Message/이미지 저장 및 사용자별 접근 권한(소유권 검증)
- 이미지 저장(업로드/삭제/서빙 권한)
- 푸시 구독 저장, 후속 알림 예약·발송·취소
- 배포, 오류·비용 확인

**책임지는 결과**: 기록이 유지되고(새로고침·재로그인 후에도), 알림과 서비스 운영이 정상적으로 이루어지는가.

**경계 밖(참고만)**: 화면/입력 UX는 A, 캐릭터 프롬프트·분석 로직·채팅 화면은 B. C는 이들이 호출할 저장·조회·인증 API와 데이터 구조를 제공한다.

## 2. 현재 상태

M0(스캐폴딩), M1(인증)까지 완료하고 실제 서버 MySQL로 검증까지 마쳤다. 서버 DB 계정(`appuser`)에 shadow database 생성 권한이 없어 `prisma migrate dev`는 P3014로 실패 → **`prisma db push`로 스키마를 직접 동기화하는 방식으로 확정**(README "시작하기" 절 참고). 마이그레이션 히스토리 파일은 당분간 쌓이지 않는다는 뜻이므로, `schema.prisma` 변경 시 반드시 `npx prisma db push`를 다시 실행해야 한다.

## 3. 작업 순서 (마일스톤)

AGENTS.md 협업 원칙 "작게 연결하며 검증한다"의 순서를 C 관점으로 그대로 따른다 — 로그인 → 상대방 저장 → 상담방 생성 → 사진/기록 저장 → 후속 알림.

| 단계 | 목표 | 완료 기준 | 상태 |
| --- | --- | --- | --- |
| M0 | 로컬 개발 환경 | 서버 MySQL `DATABASE_URL` 연결 + `npx prisma db push`로 스키마 반영, `npm run dev` 기동 | ✅ 완료 |
| M1 | 인증 | 회원가입/로그인/로그아웃, 세션으로 보호된 API 접근 가능 | ✅ 완료 (실서버 DB로 검증) |
| M2 | Partner 저장 | Partner 생성/수정 API, 소유권 검증 | ✅ 완료 (실서버 DB로 검증) |
| M3 | Conversation/Message 저장 | 상담방 생성(+인사 메시지 저장은 B와 연결), 메시지 영속 저장, 재접속 시 히스토리 복원 | ✅ 완료 (저장/조회 구조, 실서버 DB로 검증. 이미지 분석 자체는 B 연동 대기 — 아래 참고) |
| M4 | 이미지 저장 | 업로드/서빙 API, 사용자 경로 격리 + 소유자 검증 | ⬜ 예정 |
| M5 | 후속 알림 | 구독 저장, 예약/취소, 24시간 디스패치 | ⬜ 예정 |
| M6 | 배포·운영 | 배포 파이프라인, 에러/비용 모니터링 | ⬜ 예정 |

각 단계 끝에서 관련 담당(A/B)과 함께 실제로 눌러보고 연결 상태를 확인한다(AGENTS.md "매 작업일이 끝날 때 함께 실행").

## 4. 마일스톤별 세부 작업

### M0 — 프로젝트 스캐폴딩 & 로컬 환경
- `create-next-app` (App Router, TypeScript, Tailwind)
- 서버에 직접 구성된 MySQL 접속 정보(`DATABASE_URL`)로 연결 — 로컬 컨테이너 없이 원격 DB 공용 사용
- Prisma 초기화, `schema.prisma`에 데이터 모델 반영 (User/Partner/Conversation/Message/PushSubscription — AGENTS.md 데이터 모델 그대로, 필드 임의 변경 금지)
- `.env.example` 작성 (README.md 환경 변수 표와 일치)
- `npm run dev`까지 기동 확인 → A/B에게 브랜치 공유
- 개발용 DB를 여러 명이 공유하는 경우 스키마 변경(`prisma migrate`) 시 충돌 주의 — 마이그레이션 전 공유 후 반영

### M1 — 인증
- `POST /api/users` (회원가입, bcrypt 해시 저장, 이메일 중복 409)
- NextAuth Credentials Provider 설정, JWT 세션
- 세션 헬퍼(서버 컴포넌트/API 라우트에서 `userId` 꺼내는 공통 함수) — 이후 모든 API가 이 헬퍼로 소유권 검증
- A가 만들 로그인 화면과 연결 테스트

### M2 — Partner
- `POST /api/partners`, `PATCH /api/partners/:partnerId`
- 소유권 검증 공통 패턴 확정(존재하지 않거나 타인 소유면 404로 통일, AGENTS.md 보안 규칙)
- A의 입력 화면과 연결해 저장 확인

### M3 — Conversation / Message
- `POST /api/conversations`(생성), `GET /api/conversations`(목록), `GET /api/conversations/:id`(히스토리 복원)
- `POST /api/conversations/:id/messages` 중 저장/조회 구조는 C, 분석 응답 생성 로직은 B — 인터페이스(요청/응답 스키마)는 docs/API.md 고정, B가 이 스키마에 맞춰 구현하도록 맞춤
- 최초 진입 인사 메시지: `POST /api/conversations` 생성 시점에 낙관→신중→현실→시스템 순으로 1회 저장(트랜잭션), 재진입은 `GET /api/conversations/:id`가 저장된 메시지를 그대로 복원하므로 중복 생성 자체가 없음
- 재로그인/새로고침 후 메시지 순서·내용 복원 검증 완료(`createdAt asc, id asc` 정렬)
- `src/lib/analysis.ts`에 `analyzeConversationImage()` 시그니처만 확정해두고 내부는 미구현(`AnalysisNotConfiguredError`) — LLM_API_KEY 없으면 라우트가 스펙대로 `502 ANALYSIS_FAILED` 반환, 사용자 메시지는 저장 유지. **B가 이 함수 내부만 실제 비전 LLM 호출로 교체하면 연동 끝나는 구조.**

### M4 — 이미지
- `POST /api/images`(multipart, `uploads/{userId}/{uuid}.ext`), `GET /api/images/:imageId`(소유자 세션만)
- 10MB 제한, 이미지 MIME 검증
- B의 첨부 화면과 연결, 분석 API가 이 `imageUrl`을 그대로 사용하도록 확인

### M5 — 후속 알림
- `POST /api/push-subscriptions`, `DELETE /api/push-subscriptions/:id`
- `POST/DELETE /api/conversations/:id/followup` (예약/취소, 구독 없으면 409 `NO_SUBSCRIPTION`)
- `POST /api/internal/followups/dispatch`: `CRON_SECRET` 검증, `followupScheduledAt <= now && followupSentAt IS NULL` 조회 → 발송 → `followupSentAt` 기록
- 로컬 실행 방식 결정 필요(아래 5번 항목) — 우선 로컬 cron/스케줄 스크립트로 검증 후 배포 환경에 맞게 교체
- "사용자가 예약 전 먼저 대화 시작 시 자동 취소" 로직은 메시지 저장 시점(M3)에 훅으로 연결

### M6 — 배포·운영
- 배포 대상 확정(Vercel/자체 서버 등) 및 MySQL 연결 방식
- 에러 로깅(최소 서버 로그 또는 외부 서비스) 확인 체계
- LLM API 비용/사용량 확인 방법(B와 협의해 로그에 토큰/호출 수 남기기)
- 배포 후 실제 환경에서 M1~M5 체크리스트 재확인

### 부가 — API 문서(Swagger UI)
- `/api-docs`에서 Swagger UI로 docs/API.md 전체 스펙 확인 가능(구현/계획 엔드포인트 모두 표시, `x-status` 필드로 구분)
- 스펙 원본은 `src/lib/openapi.ts`(TS 객체) → `/api/openapi.json`으로 서빙 → `swagger-ui-react`가 렌더링
- `npm run dev` 기동 시 콘솔에 문서 URL 로그 출력(`src/instrumentation.ts`)
- 새 엔드포인트 구현/스펙 변경 시 **docs/API.md + src/lib/openapi.ts 둘 다** 갱신 필요(자동 동기화 아님)

## 5. 결정이 필요한 외부 요소 (환경 설정 필요)

AGENTS.md "구현 범위 구분"의 환경 설정 필요 항목 중 C가 값을 확정/셋업해야 하는 것:

- `LLM_API_KEY`: 제공사 미정 — B와 협의해 선정, 서버 환경 변수로만 보관
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`: `web-push generate-vapid-keys`로 생성
- 알림 발송 스케줄러: 로컬은 cron 또는 상시 프로세스, 배포 환경(예: Vercel이면 Vercel Cron)에 맞는 방식 선택 — 배포 대상이 정해지면 확정
- `CRON_SECRET`: 임의 값 생성, 배포 환경 변수에 등록

값이 없는 동안 알림 발송 화면/기능은 AGENTS.md 규칙대로 "데모" 배지로 명시.

## 6. A/B와 맞출 인터페이스

- **A**: 로그인/Partner 입력 화면이 호출할 API 스펙은 docs/API.md 고정판 사용. 화면 완성 전에도 C는 API를 curl/Postman으로 먼저 검증.
- **B**: `POST /api/conversations/:id/messages` 요청/응답 스키마(`needsClarification`, `assistantMessages` role 등) 변경 시 반드시 사전 공유 후 docs/API.md 갱신. 이미지 저장 경로(`imageUrl` 포맷)는 C가 제공하는 값 그대로 B가 사용.
- 검수: B가 C의 저장·알림 동작을 확인(AGENTS.md 협업 원칙) — M3~M5 완료 시점마다 B에게 실제 데이터 확인 요청.
- 최종 병합·배포는 C 책임.

## 7. 검증 체크리스트 (C 관련 부분)

- [ ] 회원가입 → 로그인 → 세션 유지(새로고침 후에도 로그인 상태)
- [ ] 상대방 정보 저장 → 재조회 시 값 일치
- [ ] 타 유저 계정으로 남의 Conversation/Partner/이미지 접근 시 전부 404
- [ ] 이미지 업로드 → 소유자만 서빙 확인
- [ ] 대화 재접속 후 메시지 기록 복원(순서/내용 일치)
- [ ] 후속 알림 신청 → 24시간 뒤(테스트 시 단축 간격) 발송 확인
- [ ] 알림 신청 전 사용자가 먼저 대화 시작 시 예약 자동 취소
- [ ] 사용자 직접 알림 취소 동작
- [ ] 알림 클릭 → 로그인 필요 시 로그인 후 해당 상담방 이동

## 8. 리스크

- DB 계정(`appuser`)에 shadow database 생성 권한이 없어 `prisma migrate dev`/`migrate deploy`를 쓸 수 없음 → `db push`로 대체, 마이그레이션 히스토리 부재. 나중에 배포 파이프라인(M6)을 잡을 때 `migrate deploy` 기반으로 전환할지, 계속 `db push`로 갈지 다시 결정 필요 — 전환하려면 shadow DB 생성 권한을 받아야 함.
- LLM 제공사 미정 → M3/M4 인터페이스는 고정하되 실제 분석 연동은 B 일정에 종속. 목업 응답으로 먼저 검증 가능하게 준비.
- 배포 환경 미정 → 스케줄러 방식(M5)이 배포 대상에 따라 바뀜. 배포 대상을 최대한 빨리 확정해야 M5 재작업을 줄인다.
- 이미지 저장을 로컬 `uploads/`로 하는 경우 배포 환경(서버리스 등)에서 파일시스템 영속성이 없을 수 있음 → 배포 대상 확정 시 스토리지 방식 재검토 필요.
