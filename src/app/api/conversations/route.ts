import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { GREETING_MESSAGES, serializeMessage, serializePartnerSummary, toLastMessagePreview } from "@/lib/conversation";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    include: {
      partner: { select: { id: true, name: true, relationship: true } },
      messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 },
    },
  });

  return NextResponse.json({
    conversations: conversations.map((c) => ({
      id: c.id,
      partner: serializePartnerSummary(c.partner),
      lastMessagePreview: toLastMessagePreview(c.messages[0]),
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      followupScheduledAt: c.followupScheduledAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const body = await req.json().catch(() => null);
  const partnerId = typeof body?.partnerId === "string" ? body.partnerId : "";
  if (!partnerId) {
    return apiError(400, "VALIDATION_ERROR", "partnerId가 필요합니다.");
  }

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner || partner.userId !== userId) {
    return apiError(404, "NOT_FOUND", "상대방 정보를 찾을 수 없습니다.");
  }

  const { conversation, messages } = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({ data: { userId, partnerId } });

    const messages = [];
    for (const greeting of GREETING_MESSAGES) {
      const message = await tx.message.create({
        data: { conversationId: conversation.id, role: greeting.role, content: greeting.content },
      });
      messages.push(message);
    }

    const lastMessage = messages[messages.length - 1];
    await tx.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: lastMessage.createdAt },
    });

    return { conversation, messages };
  });

  return NextResponse.json(
    {
      conversation: {
        id: conversation.id,
        partnerId: conversation.partnerId,
        createdAt: conversation.createdAt.toISOString(),
      },
      messages: messages.map(serializeMessage),
    },
    { status: 201 },
  );
}
