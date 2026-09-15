import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ subscriptionId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { subscriptionId } = await params;
  const existing = await prisma.pushSubscription.findUnique({ where: { id: subscriptionId } });
  if (!existing || existing.userId !== userId) {
    return apiError(404, "NOT_FOUND", "구독 정보를 찾을 수 없습니다.");
  }

  await prisma.pushSubscription.delete({ where: { id: subscriptionId } });
  return NextResponse.json({});
}
