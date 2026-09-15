import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { serializeMessage } from "@/lib/conversation";
import { analyzeConversationImage, AnalysisNotConfiguredError } from "@/lib/analysis";

export async function POST(req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { partner: true },
  });
  if (!conversation || conversation.userId !== userId) {
    return apiError(404, "NOT_FOUND", "상담방을 찾을 수 없습니다.");
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" && body.text.trim().length > 0 ? body.text.trim() : null;
  const imageUrl =
    typeof body?.imageUrl === "string" && body.imageUrl.trim().length > 0 ? body.imageUrl.trim() : null;
  if (!text && !imageUrl) {
    return apiError(400, "VALIDATION_ERROR", "text 또는 imageUrl 중 최소 하나가 필요합니다.");
  }

  // 사용자 메시지는 분석 성공 여부와 무관하게 먼저 저장 — 분석 실패(502) 시에도 유지되어야 한다.
  const userMessage = await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: text, imageUrl },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: userMessage.createdAt },
  });

  if (!imageUrl) {
    return NextResponse.json(
      { userMessage: serializeMessage(userMessage), assistantMessages: [], needsClarification: false },
      { status: 201 },
    );
  }

  const previousMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { role: true, content: true },
  });

  let analysis;
  try {
    analysis = await analyzeConversationImage({
      imageUrl,
      text,
      partner: conversation.partner,
      previousMessages,
    });
  } catch (err) {
    if (err instanceof AnalysisNotConfiguredError) {
      return apiError(502, "ANALYSIS_FAILED", "이미지 분석에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
    throw err;
  }

  const createdMessages = [];
  for (const assistantMessage of analysis.assistantMessages) {
    const message = await prisma.message.create({
      data: { conversationId: conversation.id, role: assistantMessage.role, content: assistantMessage.content },
    });
    createdMessages.push(message);
  }

  const lastCreated = createdMessages[createdMessages.length - 1];
  const updateData: { lastMessageAt: Date; firstAnalysisAt?: Date } = { lastMessageAt: lastCreated.createdAt };
  if (!analysis.needsClarification && !conversation.firstAnalysisAt) {
    updateData.firstAnalysisAt = new Date();
  }
  await prisma.conversation.update({ where: { id: conversation.id }, data: updateData });

  return NextResponse.json(
    {
      userMessage: serializeMessage(userMessage),
      assistantMessages: createdMessages.map(serializeMessage),
      needsClarification: analysis.needsClarification,
    },
    { status: 201 },
  );
}
