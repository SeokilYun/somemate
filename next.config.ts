import type { NextConfig } from "next";

// 개발 서버를 로컬이 아닌 주소(예: 배포 테스트용 서버 IP)로 접속하면 HMR 요청이 차단되는 경고가 뜬다.
// NEXTAUTH_URL의 호스트를 허용 목록에 넣어서, 각자 .env에 실제 접속 주소를 넣으면 자동으로 반영되게 한다.
function getAllowedDevOrigins(): string[] {
  if (!process.env.NEXTAUTH_URL) return [];
  try {
    return [new URL(process.env.NEXTAUTH_URL).hostname];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  // AGENTS.md는 프로젝트 공통 스펙 문서(사람이 직접 관리) — Next.js가 자동으로 덧붙이지 않도록 비활성화.
  agentRules: false,
  allowedDevOrigins: getAllowedDevOrigins(),
};

export default nextConfig;
