import type { Message, Partner } from "@/generated/prisma/client";

// 신규 상담방 최초 진입 인사(AGENTS.md 캐릭터 정의 + docs/API.md 응답 예시와 동일한 문구를 유지한다).
export const GREETING_MESSAGES = [
  { role: "optimistic", content: "왔구나! 어떤 이야기인지 궁금해 😊 같이 좋은 신호를 찾아보자." },
  { role: "cautious", content: "반가워. 앞뒤 상황까지 차근차근 살펴볼게." },
  { role: "realistic", content: "어서 와. 어떤 대화가 고민인지 보여줘. 같이 정리해보자." },
  { role: "system", content: "고민되는 대화 캡처를 올려줘. 어떤 부분이 신경 쓰이는지도 함께 알려주면 좋아." },
] as const;

export function serializeMessage(message: Message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    imageUrls: message.imageUrls as string[],
    createdAt: message.createdAt.toISOString(),
  };
}

export function serializePartnerSummary(partner: Pick<Partner, "id" | "name" | "relationship">) {
  return { id: partner.id, name: partner.name, relationship: partner.relationship };
}

export function serializePartnerDetail(
  partner: Pick<Partner, "id" | "name" | "age" | "mbti" | "interests" | "relationship">,
) {
  return {
    id: partner.id,
    name: partner.name,
    age: partner.age,
    mbti: partner.mbti,
    interests: partner.interests,
    relationship: partner.relationship,
  };
}

/** GET /api/conversations의 lastMessagePreview용 — 이미지만 있는 메시지는 텍스트 대체 문구로 보여준다. */
export function toLastMessagePreview(message: Pick<Message, "content" | "imageUrls"> | undefined) {
  if (!message) return null;
  if (message.content) return message.content;
  const imageUrls = message.imageUrls as string[];
  if (imageUrls.length > 0) return imageUrls.length > 1 ? `[이미지 ${imageUrls.length}장]` : "[이미지]";
  return null;
}
