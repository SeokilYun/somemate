import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** API 라우트/서버 컴포넌트에서 현재 로그인한 사용자의 userId를 꺼낸다. 미인증이면 null. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}
