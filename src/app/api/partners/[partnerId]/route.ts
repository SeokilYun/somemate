import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { validatePartnerFields, serializePartner } from "@/lib/partner";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ partnerId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { partnerId } = await params;

  const existing = await prisma.partner.findUnique({ where: { id: partnerId } });
  // 존재 자체를 노출하지 않도록 소유권 불일치도 동일하게 404 처리 (AGENTS.md 보안 규칙)
  if (!existing || existing.userId !== userId) {
    return apiError(404, "NOT_FOUND", "상대방 정보를 찾을 수 없습니다.");
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return apiError(400, "VALIDATION_ERROR", "요청 형식이 올바르지 않습니다.");
  }

  const result = validatePartnerFields(body, { partial: true });
  if (!result.ok) {
    return apiError(400, "VALIDATION_ERROR", result.message);
  }

  const nextRelationship = result.data.relationship ?? existing.relationship;
  const nextRelationshipCustom =
    "relationshipCustom" in result.data ? result.data.relationshipCustom : existing.relationshipCustom;

  if (nextRelationship === "other" && !nextRelationshipCustom) {
    return apiError(400, "VALIDATION_ERROR", "relationship이 other이면 relationshipCustom이 필요합니다.");
  }

  const partner = await prisma.partner.update({
    where: { id: partnerId },
    data: result.data,
  });

  return NextResponse.json({ partner: serializePartner(partner) });
}
