import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return apiError(400, "VALIDATION_ERROR", "endpoint와 keys(p256dh, auth)가 필요합니다.");
  }

  // 동일 endpoint로 재구독(페이지 재방문 등)해도 중복 없이 최신 keys로 갱신되게 upsert.
  const subscription = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, keys: { p256dh, auth } },
    update: { userId, keys: { p256dh, auth } },
  });

  return NextResponse.json({ id: subscription.id }, { status: 201 });
}
