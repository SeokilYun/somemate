import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md는 프로젝트 공통 스펙 문서(사람이 직접 관리) — Next.js가 자동으로 덧붙이지 않도록 비활성화.
  agentRules: false,
};

export default nextConfig;
