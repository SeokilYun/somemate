import jwt from "jsonwebtoken";

const ACCESS_TOKEN_TTL = "30d";

function getSecret(): string {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) throw new Error("MOBILE_JWT_SECRET 환경 변수가 설정되지 않았습니다.");
  return secret;
}

/** 네이티브 앱 전용 stateless 액세스 토큰 발급. NextAuth 세션 쿠키와는 별개 시크릿을 사용한다. */
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

/** Authorization: Bearer 헤더의 토큰을 검증해 userId를 반환한다. 유효하지 않으면 null. */
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "object" && typeof payload.sub === "string") {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}
