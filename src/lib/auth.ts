import type { Account as OAuthAccount, NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import AppleProvider from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAppleClientSecret, isAppleLoginConfigured } from "@/lib/apple-auth";

/** email/password를 검증해 유저를 반환한다. NextAuth(웹 쿠키 세션)와 모바일 토큰 로그인이 공유한다. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, email: user.email };
}

const OAUTH_PROVIDERS: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  OAUTH_PROVIDERS.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  OAUTH_PROVIDERS.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      profile(profile) {
        // 카카오는 "account_email" 스코프가 비즈니스 앱 심사를 통과하기 전엔 이메일을 안 줄 수 있다.
        // User.email이 필수(unique)라 없으면 카카오 고유 id로 임시 이메일을 만들어 채운다.
        const account = profile.kakao_account as
          | { email?: string; profile?: { nickname?: string; profile_image_url?: string } }
          | undefined;
        return {
          id: String(profile.id),
          name: account?.profile?.nickname ?? null,
          email: account?.email ?? `kakao_${profile.id}@kakao.somemate.local`,
          image: account?.profile?.profile_image_url ?? null,
        };
      },
    }),
  );
}

if (isAppleLoginConfigured()) {
  OAUTH_PROVIDERS.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: getAppleClientSecret(),
    }),
  );
}

const OAUTH_PROVIDER_IDS = new Set(["google", "kakao", "apple"]);

/**
 * 소셜 로그인 계정을 이메일 기준으로 연결한다(PrismaAdapter 없이 직접 처리, 세션은 JWT 전략 유지).
 * 이미 이메일/비밀번호로 가입한 계정과 같은 이메일이면 그 계정에 자동으로 연결된다 — Google/Kakao/Apple은
 * 자체적으로 이메일 소유권을 검증하므로 허용 가능한 리스크로 판단(신규 서비스, 계정 연결 화면 없음).
 */
async function linkOAuthAccount(user: NextAuthUser, account: OAuthAccount): Promise<boolean> {
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
  });
  if (existingAccount) {
    user.id = existingAccount.userId;
    return true;
  }

  const email = user.email;
  if (!email) return false;

  const dbUser = await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  await prisma.account.create({
    data: {
      userId: dbUser.id,
      type: account.type,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
    },
  });

  user.id = dbUser.id;
  return true;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        return verifyCredentials(credentials.email, credentials.password);
      },
    }),
    ...OAUTH_PROVIDERS,
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !OAUTH_PROVIDER_IDS.has(account.provider)) return true;
      return linkOAuthAccount(user, account);
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id;
      return session;
    },
  },
};
