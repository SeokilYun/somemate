import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { serializeMessage, serializePartnerDetail } from "@/lib/conversation";

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      partner: true,
      messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });

  if (!conversation || conversation.userId !== userId) {
    return apiError(404, "NOT_FOUND", "상담방을 찾을 수 없습니다.");
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      createdAt: conversation.createdAt.toISOString(),
      firstAnalysisAt: conversation.firstAnalysisAt?.toISOString() ?? null,
      followupScheduledAt: conversation.followupScheduledAt?.toISOString() ?? null,
    },
    partner: serializePartnerDetail(conversation.partner),
    messages: conversation.messages.map(serializeMessage),
  });
}
