import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyAccessToken } from "@/lib/mobile-token";

/**
 * API 라우트/서버 컴포넌트에서 현재 로그인한 사용자의 userId를 꺼낸다. 미인증이면 null.
 * 웹은 NextAuth 세션 쿠키, 네이티브 앱은 Authorization: Bearer 토큰으로 인증한다.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyAccessToken(authHeader.slice("Bearer ".length));
  }
  return null;
}
