import jwt from "jsonwebtoken";

let cachedClientSecret: string | null = null;

/**
 * Apple은 clientSecret으로 고정 문자열이 아니라 ES256 서명된 JWT를 요구한다(최대 6개월 유효).
 * 매 요청마다 새로 만들 필요는 없어 프로세스 생애주기 동안 캐싱한다.
 */
export function getAppleClientSecret(): string {
  if (cachedClientSecret) return cachedClientSecret;

  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !clientId || !privateKey) {
    throw new Error("Apple 로그인에 필요한 환경 변수(APPLE_TEAM_ID/APPLE_KEY_ID/APPLE_CLIENT_ID/APPLE_PRIVATE_KEY)가 없습니다.");
  }

  cachedClientSecret = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: teamId,
    audience: "https://appleid.apple.com",
    subject: clientId,
    keyid: keyId,
  });

  return cachedClientSecret;
}

export function isAppleLoginConfigured(): boolean {
  return Boolean(
    process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_CLIENT_ID && process.env.APPLE_PRIVATE_KEY,
  );
}
