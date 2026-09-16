# API 스펙

기본 규칙:
- 모든 응답은 JSON. 에러는 `{ "error": { "code": string, "message": string } }` 형식, HTTP 상태코드 병행.
- `POST /api/users`(회원가입), `/api/auth/*` 를 제외한 모든 엔드포인트는 세션 필요 → 미인증 시 `401 UNAUTHENTICATED`.
- 소유권 검증: `Partner`/`Conversation`/`Message`/이미지 리소스는 요청자의 `userId`와 일치할 때만 조회·수정 가능 → 불일치 시 `404 NOT_FOUND`(존재 자체를 노출하지 않음).
- 이미지 분석 및 캐릭터 응답 생성은 비전 지원 LLM API를 사용(제공사 미정). 어떤 제공사를 쓰든 서버에서만 키를 사용하고, 아래 스펙(요청/응답 형식)은 동일하게 유지한다.
- Message `role`: `user | optimistic | cautious | realistic | system`
- 리소스 컬렉션은 복수형 명사, 하위 리소스는 `/부모컬렉션/:id/자식컬렉션` 형태로 중첩한다.

## 1. 인증

### POST /api/users
회원가입(사용자 리소스 생성).
- Request: `{ "email": string, "password": string }`
- 201: `{ "id": string, "email": string }`
- 400 `VALIDATION_ERROR`: 이메일 형식/비밀번호 길이 미달
- 409 `EMAIL_TAKEN`: 이메일 중복

### /api/auth/[...nextauth]
NextAuth Credentials Provider가 처리(프레임워크 표준 경로, REST 리소스 규칙 예외). 클라이언트는 보통 `signIn`/`signOut`/`useSession`(next-auth/react)으로 감싸 호출하면 되지만, 아래는 실제로 발생하는 하위 요청이다(NextAuth 내부 구현이라 스펙은 참고용, 언제든 바뀔 수 있음).
- `GET /api/auth/csrf` → `{ "csrfToken": string }` — 로그인/로그아웃 POST 전에 먼저 호출해 토큰을 받아야 함
- `POST /api/auth/callback/credentials` (`application/x-www-form-urlencoded`, `{ email, password, csrfToken }`) — 로그인: NextAuth `signIn("credentials", { email, password })` → 실패 시 `CredentialsSignin` 에러를 클라이언트에서 매핑해 "이메일 또는 비밀번호가 올바르지 않습니다" 표시.
- `POST /api/auth/signout` (`{ csrfToken }`) — 로그아웃: `signOut()`, 세션 쿠키 삭제
- `GET /api/auth/session` → `{ user: { id, email } } | {}` — 세션 조회

## 2. 상대방 정보 (Partner)

### POST /api/partners
Request:
```json
{
  "name": "string (required)",
  "age": "number | null",
  "mbti": "string | null",
  "interests": ["string"],
  "relationship": "some | dating | coworker | friend | parent | other",
  "relationshipCustom": "string | null (relationship=other일 때)"
}
```
- 201: `{ "partner": Partner }`
- 400 `VALIDATION_ERROR`: name 누락, relationship 누락, relationship=other인데 relationshipCustom 누락

### PATCH /api/partners/:partnerId
Request: 위 필드 중 일부(부분 업데이트)
- 200: `{ "partner": Partner }`
- 404: 본인 소유 아님/존재하지 않음

## 3. 상담방 (Conversation)

### GET /api/conversations
사용자의 상담방 목록(메인페이지 카드용), `lastMessageAt` 내림차순.
- 200:
```json
{
  "conversations": [
    {
      "id": "string",
      "partner": { "id": "string", "name": "string", "relationship": "string" },
      "lastMessagePreview": "string | null",
      "lastMessageAt": "string(ISO) | null",
      "followupScheduledAt": "string(ISO) | null"
    }
  ]
}
```

### POST /api/conversations
'세 친구 초대하고 시작하기' → 상담방 생성 + 3캐릭터 인사 메시지 자동 생성.
- Request: `{ "partnerId": "string" }`
- 201:
```json
{
  "conversation": { "id": "string", "partnerId": "string", "createdAt": "string" },
  "messages": [
    { "id": "string", "role": "optimistic", "content": "왔구나! 어떤 이야기인지 궁금해 😊 같이 좋은 신호를 찾아보자.", "createdAt": "string" },
    { "id": "string", "role": "cautious", "content": "반가워. 앞뒤 상황까지 차근차근 살펴볼게.", "createdAt": "string" },
    { "id": "string", "role": "realistic", "content": "어서 와. 어떤 대화가 고민인지 보여줘. 같이 정리해보자.", "createdAt": "string" },
    { "id": "string", "role": "system", "content": "고민되는 대화 캡처를 올려줘. 어떤 부분이 신경 쓰이는지도 함께 알려주면 좋아.", "createdAt": "string" }
  ]
}
```
- 400 `VALIDATION_ERROR`: partnerId 없음
- 404: partnerId가 본인 소유 아님

### GET /api/conversations/:id
채팅방 진입/재접속 시 전체 히스토리 복원.
- 200:
```json
{
  "conversation": { "id": "string", "createdAt": "string", "firstAnalysisAt": "string | null", "followupScheduledAt": "string | null" },
  "partner": { "id": "string", "name": "string", "age": "number|null", "mbti": "string|null", "interests": ["string"], "relationship": "string" },
  "messages": [
    { "id": "string", "role": "user", "content": "string|null", "imageUrl": "string|null", "createdAt": "string" }
  ]
}
```
- 404: 본인 소유 아님

## 4. 메시지 & 분석

### POST /api/conversations/:id/messages
텍스트/이미지 전송 → 사용자 메시지 저장 후, 이미지가 있으면 3캐릭터 분석을 동기 처리해 함께 반환. 클라이언트는 응답 대기 중 "분석 중" 상태를 표시.
- Request: `{ "text": "string | null", "imageUrl": "string | null" }` (`text`, `imageUrl` 중 최소 하나 필수, `imageUrl`은 `POST /api/images` 응답값 사용)
- 201 (정상 분석):
```json
{
  "userMessage": { "id": "string", "role": "user", "content": "string|null", "imageUrl": "string|null", "createdAt": "string" },
  "assistantMessages": [
    { "id": "string", "role": "optimistic", "content": "string", "createdAt": "string" },
    { "id": "string", "role": "cautious", "content": "string", "createdAt": "string" },
    { "id": "string", "role": "realistic", "content": "string", "createdAt": "string" }
  ],
  "needsClarification": false
}
```
- 201 (이미지 글자를 읽기 어렵거나 발화자 불분명 — 임의 추측 금지):
```json
{
  "userMessage": { "...": "..." },
  "assistantMessages": [
    { "id": "string", "role": "system", "content": "이미지에서 이 부분이 잘 안 보이는데, 어떤 내용인지 / 누가 한 말인지 알려줄 수 있어?", "createdAt": "string" }
  ],
  "needsClarification": true
}
```
- 400 `VALIDATION_ERROR`: text와 imageUrl 둘 다 없음
- 404: 본인 상담방 아님
- 502 `ANALYSIS_FAILED`: 분석 API 호출 실패 → 클라이언트는 재시도 버튼 표시(사용자 메시지는 이미 저장된 상태 유지)

### GET /api/conversations/:id/messages?cursor=&limit=
페이지네이션이 필요할 경우의 메시지 목록 조회(기본은 `GET /api/conversations/:id`로 충분).
- 200: `{ "messages": [...], "nextCursor": "string | null" }`

## 5. 이미지 (Image)

### POST /api/images
`multipart/form-data`, field 이름 `image`. 단일 이미지, 서버에서 `userId/uuid.ext` 경로로 저장.
- 201: `{ "id": "string", "imageUrl": "/api/images/{id}" }`
- 400 `VALIDATION_ERROR`: 파일 없음/이미지 아님/용량 초과(예: 10MB 제한)

### GET /api/images/:imageId
이미지 소유자 세션만 접근 허용.
- 200: 이미지 바이너리
- 404: 본인 소유 아님/존재하지 않음

## 6. 후속 알림 (Web Push)

### POST /api/push-subscriptions
브라우저 Push 구독 정보를 사용자 계정에 리소스로 저장.
- Request: `{ "endpoint": "string", "keys": { "p256dh": "string", "auth": "string" } }`
- 201: `{ "id": "string" }`

### DELETE /api/push-subscriptions/:subscriptionId
- 200: `{}`
- 404: 본인 소유 아님/존재하지 않음

### POST /api/conversations/:id/followup
"내일 이 이야기 다시 나눠볼까?" 알림 신청. `followupScheduledAt = now + 24h` 설정.
- 200: `{ "followupScheduledAt": "string(ISO)" }`
- 404: 본인 상담방 아님
- 409 `NO_SUBSCRIPTION`: 저장된 Push 구독이 없음(클라이언트에서 먼저 권한 요청 + `POST /api/push-subscriptions` 호출 필요)

### DELETE /api/conversations/:id/followup
알림 예약 취소(사용자 직접 취소, 또는 사용자가 먼저 후속 대화를 시작했을 때 서버가 자동 호출).
- 200: `{}`

### POST /api/internal/followups/dispatch (내부 전용)
예약 시각이 지난 미발송 알림을 일괄 발송. 공개 API가 아니며 외부에서 호출 불가하도록 `Authorization: Bearer {CRON_SECRET}` 헤더 필수(스케줄러/크론에서만 호출).
- 200: `{ "sent": number }`
- 401: 시크릿 불일치
- 동작: `followupScheduledAt <= now && followupSentAt IS NULL` 인 Conversation을 조회 → 해당 유저의 모든 PushSubscription에 `"그 이야기, 어떻게 됐어? 이어서 이야기해볼까?"` 발송 → `followupSentAt = now` 기록. 클릭 시 이동 URL은 `/conversations/{id}`.

## 참고: 상수 정의

```ts
type Relationship = "some" | "dating" | "coworker" | "friend" | "parent" | "other";
type MessageRole = "user" | "optimistic" | "cautious" | "realistic" | "system";
```
