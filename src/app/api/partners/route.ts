import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { validatePartnerFields, serializePartner } from "@/lib/partner";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return apiError(400, "VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
  }

  const result = validatePartnerFields(body, { partial: false });
  if (!result.ok) {
    return apiError(400, "VALIDATION_ERROR", result.message);
  }

  const { name, age = null, mbti = null, interests = [], relationship, relationshipCustom = null } = result.data;

  if (relationship === "other" && !relationshipCustom) {
    return apiError(400, "VALIDATION_ERROR", "relationship이 other이면 relationshipCustom이 필요합니다.");
  }

  const partner = await prisma.partner.create({
    data: {
      userId,
      // validatePartnerFields가 partial:false일 때 name/relationship을 보장한다.
      name: name as string,
      age,
      mbti,
      interests,
      relationship: relationship!,
      relationshipCustom,
    },
  });

  return NextResponse.json({ partner: serializePartner(partner) }, { status: 201 });
}
