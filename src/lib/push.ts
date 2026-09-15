import webpush from "web-push";

const FOLLOWUP_MESSAGE = "그 이야기, 어떻게 됐어? 이어서 이야기해볼까?";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY가 설정되지 않았습니다.");
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:noreply@somemate.app", publicKey, privateKey);
  configured = true;
}

type StoredSubscriptionKeys = { p256dh: string; auth: string };

/**
 * 후속 알림 1건 발송. 실패해도 예외를 던지지 않고 결과를 반환한다 —
 * 호출부(dispatch 라우트)가 구독 만료(410/404) 시 DB 정리를 판단할 수 있게 하기 위함.
 */
export async function sendFollowupPush(
  subscription: { endpoint: string; keys: unknown },
  conversationId: string,
): Promise<{ ok: true } | { ok: false; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys as StoredSubscriptionKeys },
      JSON.stringify({ title: "썸메이트", body: FOLLOWUP_MESSAGE, url: `/conversations/${conversationId}` }),
    );
    return { ok: true };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return { ok: false, expired: statusCode === 404 || statusCode === 410 };
  }
}
