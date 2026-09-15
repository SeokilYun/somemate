import { Relationship } from "@/generated/prisma/client";

const RELATIONSHIP_VALUES = Object.values(Relationship) as string[];

type PartnerBody = Record<string, unknown>;

export type ValidatedPartnerFields = {
  name?: string;
  age?: number | null;
  mbti?: string | null;
  interests?: string[];
  relationship?: Relationship;
  relationshipCustom?: string | null;
};

type ValidationResult =
  | { ok: true; data: ValidatedPartnerFields }
  | { ok: false; message: string };

/**
 * partial=false(POST): 필수 필드(name, relationship) 누락 시 실패.
 * partial=true(PATCH): 요청 본문에 있는 필드만 검사·반환.
 */
export function validatePartnerFields(body: PartnerBody, { partial }: { partial: boolean }): ValidationResult {
  const data: ValidatedPartnerFields = {};

  const hasName = "name" in body;
  if (!partial || hasName) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return { ok: false, message: "name은 필수입니다." };
    }
    data.name = body.name.trim();
  }

  if ("age" in body) {
    if (body.age !== null && typeof body.age !== "number") {
      return { ok: false, message: "age는 숫자 또는 null이어야 합니다." };
    }
    data.age = body.age;
  }

  if ("mbti" in body) {
    if (body.mbti !== null && typeof body.mbti !== "string") {
      return { ok: false, message: "mbti는 문자열 또는 null이어야 합니다." };
    }
    data.mbti = body.mbti;
  }

  if ("interests" in body) {
    if (!Array.isArray(body.interests) || !body.interests.every((v) => typeof v === "string")) {
      return { ok: false, message: "interests는 문자열 배열이어야 합니다." };
    }
    data.interests = body.interests;
  }

  const hasRelationship = "relationship" in body;
  if (!partial || hasRelationship) {
    if (typeof body.relationship !== "string" || !RELATIONSHIP_VALUES.includes(body.relationship)) {
      return { ok: false, message: "relationship 값이 올바르지 않습니다." };
    }
    data.relationship = body.relationship as Relationship;
  }

  if ("relationshipCustom" in body) {
    if (body.relationshipCustom !== null && typeof body.relationshipCustom !== "string") {
      return { ok: false, message: "relationshipCustom은 문자열 또는 null이어야 합니다." };
    }
    data.relationshipCustom = body.relationshipCustom as string | null;
  }

  return { ok: true, data };
}

export function serializePartner(partner: {
  id: string;
  name: string;
  age: number | null;
  mbti: string | null;
  interests: unknown;
  relationship: string;
  relationshipCustom: string | null;
}) {
  return {
    id: partner.id,
    name: partner.name,
    age: partner.age,
    mbti: partner.mbti,
    interests: partner.interests,
    relationship: partner.relationship,
    relationshipCustom: partner.relationshipCustom,
  };
}
