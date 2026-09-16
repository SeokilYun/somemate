import type { Message, Partner } from "@/generated/prisma/client";

export class AnalysisNotConfiguredError extends Error {}

export type CharacterAnalysisResult =
  | {
      needsClarification: false;
      assistantMessages: Array<{ role: "optimistic" | "cautious" | "realistic"; content: string }>;
    }
  | {
      needsClarification: true;
      assistantMessages: Array<{ role: "system"; content: string }>;
    };

/**
 * 이미지 기반 3캐릭터 분석(비전 LLM 호출). AGENTS.md 기능별 역할 경계상 "사진 분석" 해석 로직은 B 담당.
 * 제공사/LLM_API_KEY가 아직 정해지지 않아 여기서는 미구현 상태로 두고, 호출부(messages 라우트)가
 * 이 에러를 잡아 스펙에 정의된 502 ANALYSIS_FAILED로 응답하도록 한다.
 * TODO(B): 실제 비전 LLM 호출로 이 함수 내부를 교체.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO(B): 구현 시 사용
export async function analyzeConversationImage(_input: {
  imageUrls: string[];
  text: string | null;
  partner: Pick<Partner, "name" | "age" | "mbti" | "interests" | "relationship" | "relationshipCustom">;
  previousMessages: Array<Pick<Message, "role" | "content">>;
}): Promise<CharacterAnalysisResult> {
  if (!process.env.LLM_API_KEY) {
    throw new AnalysisNotConfiguredError("LLM_API_KEY가 설정되지 않았습니다.");
  }
  throw new AnalysisNotConfiguredError("이미지 분석 연동이 아직 구현되지 않았습니다.");
}
