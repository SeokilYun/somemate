import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { sendFollowupPush } from "@/lib/push";

/**
 * 내부 전용 — 외부에서 호출 불가하도록 CRON_SECRET 필요.
 * 스케줄러(cron 등)가 주기적으로 호출한다. docs/API.md 5.4 참고.
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return apiError(401, "UNAUTHENTICATED", "시크릿이 일치하지 않습니다.");
  }

  const dueConversations = await prisma.conversation.findMany({
    where: { followupScheduledAt: { lte: new Date() }, followupSentAt: null },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  let sent = 0;
  for (const conversation of dueConversations) {
    for (const subscription of conversation.user.pushSubscriptions) {
      const result = await sendFollowupPush(subscription, conversation.id);
      if (!result.ok && result.expired) {
        // 브라우저/OS에서 이미 만료된 구독 — 더 보내봐야 실패하므로 정리한다.
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
      }
    }

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { followupSentAt: new Date() },
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}
