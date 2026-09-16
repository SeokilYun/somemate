import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/auth";
import { signAccessToken } from "@/lib/mobile-token";
import { apiError } from "@/lib/api-error";

/** 네이티브 앱 전용 로그인. 쿠키 대신 Authorization: Bearer로 실어 보낼 액세스 토큰을 발급한다. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return apiError(400, "VALIDATION_ERROR", "email과 password가 필요합니다.");
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return apiError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
  }

  return NextResponse.json({ accessToken: signAccessToken(user.id) });
}
