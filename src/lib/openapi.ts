/**
 * OpenAPI 3.0 스펙 — docs/API.md를 그대로 옮긴 것.
 * 각 operation의 `x-status`는 실제 코드 구현 여부를 나타낸다:
 *   - "implemented": src/app/api 아래에 라우트 핸들러가 존재
 *   - "planned": docs/API.md에는 정의되어 있지만 아직 구현 전
 * 엔드포인트를 새로 구현하거나 스펙을 바꾸면 이 파일과 docs/API.md를 함께 갱신한다.
 */

const ErrorResponse = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: {
        code: { type: "string" },
        message: { type: "string" },
      },
      required: ["code", "message"],
    },
  },
  required: ["error"],
};

const Partner = {
  type: "object",
  properties: {
    id: { type: "string" },
    name: { type: "string" },
    age: { type: "integer", nullable: true },
    mbti: { type: "string", nullable: true },
    interests: { type: "array", items: { type: "string" } },
    relationship: { $ref: "#/components/schemas/Relationship" },
    relationshipCustom: { type: "string", nullable: true },
  },
};

const Message = {
  type: "object",
  properties: {
    id: { type: "string" },
    role: { $ref: "#/components/schemas/MessageRole" },
    content: { type: "string", nullable: true },
    imageUrl: { type: "string", nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "썸메이트 (Somemate) API",
    version: "0.1.0",
    description:
      "docs/API.md 기반 스펙. `x-status: implemented`는 실제 구현되어 동작하는 엔드포인트, " +
      "`x-status: planned`는 아직 구현되지 않은(계획 단계) 엔드포인트다.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "인증", description: "회원가입/로그인/세션" },
    { name: "상대방", description: "상담 대상(Partner) 정보" },
    { name: "상담방", description: "Conversation 생성·조회" },
    { name: "메시지", description: "메시지 전송 및 3캐릭터 분석" },
    { name: "이미지", description: "이미지 업로드/서빙" },
    { name: "후속 알림", description: "Web Push 구독 및 24시간 후속 알림" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "웹 브라우저용 NextAuth JWT 세션 쿠키. /api/users, /api/auth/* 제외 모든 엔드포인트에 필요.",
      },
      bearerToken: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "네이티브 앱 전용. POST /api/auth/mobile-login으로 발급받은 액세스 토큰.",
      },
    },
    schemas: {
      Relationship: {
        type: "string",
        enum: ["some", "dating", "coworker", "friend", "parent", "other"],
      },
      MessageRole: {
        type: "string",
        enum: ["user", "optimistic", "cautious", "realistic", "system"],
      },
      Error: ErrorResponse,
      Partner,
      Message,
    },
  },
  security: [{ sessionCookie: [] }, { bearerToken: [] }],
  paths: {
    "/api/users": {
      post: {
        tags: ["인증"],
        summary: "회원가입",
        "x-status": "implemented",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "생성됨",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { id: { type: "string" }, email: { type: "string" } },
                },
              },
            },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "409": { description: "EMAIL_TAKEN", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
    "/api/auth/session": {
      get: {
        tags: ["인증"],
        summary: "세션 조회 (NextAuth 표준 경로)",
        "x-status": "implemented",
        responses: {
          "200": {
            description: "로그인 상태면 user 포함, 아니면 빈 객체",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      nullable: true,
                      properties: { id: { type: "string" }, email: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/mobile-login": {
      post: {
        tags: ["인증"],
        summary: "네이티브 앱 로그인 (액세스 토큰 발급)",
        description:
          "웹의 쿠키 세션 대신, 네이티브 앱이 이후 요청에 Authorization: Bearer 헤더로 실어 보낼 " +
          "stateless JWT를 발급한다. 앱은 이 토큰을 Keychain/Keystore에 저장한다.",
        "x-status": "implemented",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: { email: { type: "string" }, password: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "발급됨",
            content: {
              "application/json": {
                schema: { type: "object", properties: { accessToken: { type: "string" } } },
              },
            },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": {
            description: "INVALID_CREDENTIALS — 이메일/비밀번호 불일치",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    },
    "/api/auth/csrf": {
      get: {
        tags: ["인증"],
        summary: "CSRF 토큰 발급 (NextAuth 표준 경로)",
        description:
          "로그인/로그아웃 POST 전에 먼저 호출해 csrfToken을 받아야 한다. NextAuth 내부 구현이라 스펙은 참고용.",
        "x-status": "implemented",
        security: [],
        responses: {
          "200": {
            description: "csrfToken 반환",
            content: {
              "application/json": {
                schema: { type: "object", properties: { csrfToken: { type: "string" } } },
              },
            },
          },
        },
      },
    },
    "/api/auth/callback/credentials": {
      post: {
        tags: ["인증"],
        summary: "로그인 (NextAuth Credentials 콜백, 표준 경로)",
        description:
          "email/password 로그인. NextAuth 내부 구현이라 스펙은 참고용 — csrfToken 포함 필수, " +
          "성공 시 next-auth.session-token 쿠키가 설정된다.",
        "x-status": "implemented",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["email", "password", "csrfToken"],
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                  csrfToken: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "로그인 성공 — 세션 쿠키 설정 후 redirect 응답" },
          "401": { description: "이메일/비밀번호 불일치 (CredentialsSignin 에러로 리다이렉트)" },
        },
      },
    },
    "/api/auth/signout": {
      post: {
        tags: ["인증"],
        summary: "로그아웃 (NextAuth 표준 경로)",
        description: "csrfToken 포함 POST 필요. NextAuth 내부 구현이라 스펙은 참고용.",
        "x-status": "implemented",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/x-www-form-urlencoded": {
              schema: {
                type: "object",
                required: ["csrfToken"],
                properties: { csrfToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "세션 쿠키 삭제됨" },
        },
      },
    },
    "/api/partners": {
      post: {
        tags: ["상대방"],
        summary: "상대방 정보 생성",
        "x-status": "implemented",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "relationship"],
                properties: {
                  name: { type: "string" },
                  age: { type: "integer", nullable: true },
                  mbti: { type: "string", nullable: true },
                  interests: { type: "array", items: { type: "string" } },
                  relationship: { $ref: "#/components/schemas/Relationship" },
                  relationshipCustom: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "생성됨",
            content: { "application/json": { schema: { type: "object", properties: { partner: Partner } } } },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
    "/api/partners/{partnerId}": {
      patch: {
        tags: ["상대방"],
        summary: "상대방 정보 부분 수정",
        "x-status": "implemented",
        parameters: [{ name: "partnerId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  age: { type: "integer", nullable: true },
                  mbti: { type: "string", nullable: true },
                  interests: { type: "array", items: { type: "string" } },
                  relationship: { $ref: "#/components/schemas/Relationship" },
                  relationshipCustom: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "수정됨",
            content: { "application/json": { schema: { type: "object", properties: { partner: Partner } } } },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": {
            description: "본인 소유 아님/존재하지 않음",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    },
    "/api/conversations": {
      get: {
        tags: ["상담방"],
        summary: "상담방 목록 (메인페이지 카드)",
        "x-status": "implemented",
        responses: {
          "200": {
            description: "lastMessageAt 내림차순",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    conversations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          partner: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              relationship: { type: "string" },
                            },
                          },
                          lastMessagePreview: { type: "string", nullable: true },
                          lastMessageAt: { type: "string", format: "date-time", nullable: true },
                          followupScheduledAt: { type: "string", format: "date-time", nullable: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
      post: {
        tags: ["상담방"],
        summary: "상담방 생성 (세 친구 초대하고 시작하기)",
        "x-status": "implemented",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["partnerId"], properties: { partnerId: { type: "string" } } },
            },
          },
        },
        responses: {
          "201": {
            description: "생성됨 + 3캐릭터 인사 메시지 자동 생성",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    conversation: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        partnerId: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                    messages: { type: "array", items: Message },
                  },
                },
              },
            },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": {
            description: "partnerId가 본인 소유 아님",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    },
    "/api/conversations/{id}": {
      get: {
        tags: ["상담방"],
        summary: "상담방 히스토리 복원",
        "x-status": "implemented",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "전체 메시지 포함",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    conversation: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        createdAt: { type: "string", format: "date-time" },
                        firstAnalysisAt: { type: "string", format: "date-time", nullable: true },
                        followupScheduledAt: { type: "string", format: "date-time", nullable: true },
                      },
                    },
                    partner: Partner,
                    messages: { type: "array", items: Message },
                  },
                },
              },
            },
          },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": { description: "본인 소유 아님", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
    "/api/conversations/{id}/messages": {
      post: {
        tags: ["메시지"],
        summary: "메시지 전송 (+이미지 있으면 3캐릭터 분석)",
        description:
          "저장/조회 구조는 구현 완료. 실제 비전 LLM 분석(src/lib/analysis.ts)은 아직 미구현 상태라 " +
          "이미지가 포함된 요청은 현재 항상 502 ANALYSIS_FAILED를 반환한다(사용자 메시지는 저장됨).",
        "x-status": "implemented",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string", nullable: true },
                  imageUrl: { type: "string", nullable: true },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "정상 분석 또는 확인 질문(needsClarification)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    userMessage: Message,
                    assistantMessages: { type: "array", items: Message },
                    needsClarification: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": { description: "본인 상담방 아님", content: { "application/json": { schema: ErrorResponse } } },
          "502": {
            description: "ANALYSIS_FAILED — 분석 API 호출 실패, 사용자 메시지는 저장된 상태 유지",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
      get: {
        tags: ["메시지"],
        summary: "메시지 목록 페이지네이션 (기본은 GET /api/conversations/:id로 충분)",
        "x-status": "planned",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          { name: "cursor", in: "query", required: false, schema: { type: "string" } },
          { name: "limit", in: "query", required: false, schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            description: "미구현",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    messages: { type: "array", items: Message },
                    nextCursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/images": {
      post: {
        tags: ["이미지"],
        summary: "이미지 업로드",
        description:
          "jpeg/png/webp/gif만 허용, 10MB 제한. uploads/{userId}/{uuid}.ext 경로에 저장(DB 테이블 없이 경로 자체로 소유자 격리).",
        "x-status": "implemented",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { type: "object", properties: { image: { type: "string", format: "binary" } } },
            },
          },
        },
        responses: {
          "201": {
            description: "생성됨",
            content: {
              "application/json": {
                schema: { type: "object", properties: { id: { type: "string" }, imageUrl: { type: "string" } } },
              },
            },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
    "/api/images/{imageId}": {
      get: {
        tags: ["이미지"],
        summary: "이미지 조회 (소유자만)",
        "x-status": "implemented",
        parameters: [{ name: "imageId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "이미지 바이너리" },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": {
            description: "본인 소유 아님/존재하지 않음",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    },
    "/api/push-subscriptions": {
      post: {
        tags: ["후속 알림"],
        summary: "Web Push 구독 등록",
        description: "동일 endpoint로 재구독하면 upsert로 갱신(중복 생성 없음).",
        "x-status": "implemented",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["endpoint", "keys"],
                properties: {
                  endpoint: { type: "string" },
                  keys: {
                    type: "object",
                    properties: { p256dh: { type: "string" }, auth: { type: "string" } },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "생성됨",
            content: { "application/json": { schema: { type: "object", properties: { id: { type: "string" } } } } },
          },
          "400": { description: "VALIDATION_ERROR", content: { "application/json": { schema: ErrorResponse } } },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
    "/api/push-subscriptions/{subscriptionId}": {
      delete: {
        tags: ["후속 알림"],
        summary: "Web Push 구독 삭제",
        "x-status": "implemented",
        parameters: [{ name: "subscriptionId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "삭제됨" },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": {
            description: "본인 소유 아님/존재하지 않음",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    },
    "/api/conversations/{id}/followup": {
      post: {
        tags: ["후속 알림"],
        summary: "후속 알림 신청 (24시간 뒤 발송 예약)",
        "x-status": "implemented",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "예약됨",
            content: {
              "application/json": {
                schema: { type: "object", properties: { followupScheduledAt: { type: "string" } } },
              },
            },
          },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": {
            description: "본인 상담방 아님",
            content: { "application/json": { schema: ErrorResponse } },
          },
          "409": {
            description: "NO_SUBSCRIPTION — 저장된 Push 구독 없음",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
      delete: {
        tags: ["후속 알림"],
        summary: "후속 알림 예약 취소",
        "x-status": "implemented",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "취소됨" },
          "401": { description: "UNAUTHENTICATED", content: { "application/json": { schema: ErrorResponse } } },
          "404": { description: "본인 상담방 아님", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
    "/api/internal/followups/dispatch": {
      post: {
        tags: ["후속 알림"],
        summary: "예약된 후속 알림 일괄 발송 (내부 전용, CRON_SECRET 필요)",
        description: "외부 스케줄러(cron 등)가 주기적으로 호출. scripts/dispatch-followups.sh 참고.",
        "x-status": "implemented",
        security: [],
        parameters: [
          {
            name: "Authorization",
            in: "header",
            required: true,
            schema: { type: "string" },
            description: "Bearer {CRON_SECRET}",
          },
        ],
        responses: {
          "200": {
            description: "발송 완료(개수는 발송 시도한 상담방 수)",
            content: { "application/json": { schema: { type: "object", properties: { sent: { type: "integer" } } } } },
          },
          "401": { description: "시크릿 불일치", content: { "application/json": { schema: ErrorResponse } } },
        },
      },
    },
  },
};
