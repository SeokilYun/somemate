import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";

const FOLLOWUP_DELAY_MS = 24 * 60 * 60 * 1000;

async function getOwnedConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== userId) return null;
  return conversation;
}

export async function POST(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { conversationId } = await params;
  const conversation = await getOwnedConversation(userId, conversationId);
  if (!conversation) {
    return apiError(404, "NOT_FOUND", "상담방을 찾을 수 없습니다.");
  }

  const subscriptionCount = await prisma.pushSubscription.count({ where: { userId } });
  if (subscriptionCount === 0) {
    return apiError(409, "NO_SUBSCRIPTION", "저장된 Push 구독이 없습니다. 먼저 알림 권한을 허용해주세요.");
  }

  const followupScheduledAt = new Date(Date.now() + FOLLOWUP_DELAY_MS);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { followupScheduledAt, followupSentAt: null },
  });

  return NextResponse.json({ followupScheduledAt: followupScheduledAt.toISOString() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { conversationId } = await params;
  const conversation = await getOwnedConversation(userId, conversationId);
  if (!conversation) {
    return apiError(404, "NOT_FOUND", "상담방을 찾을 수 없습니다.");
  }

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { followupScheduledAt: null },
  });

  return NextResponse.json({});
}
