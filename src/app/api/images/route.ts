import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { MAX_IMAGE_SIZE_BYTES, extensionForMimeType, uploadsDirFor } from "@/lib/images";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("image");
  if (!file || typeof file === "string") {
    return apiError(400, "VALIDATION_ERROR", "image 파일이 필요합니다.");
  }

  const extension = extensionForMimeType(file.type);
  if (!extension) {
    return apiError(400, "VALIDATION_ERROR", "이미지 파일(jpeg/png/webp/gif)만 업로드할 수 있습니다.");
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return apiError(400, "VALIDATION_ERROR", "이미지 용량은 10MB를 초과할 수 없습니다.");
  }

  const filename = `${randomUUID()}${extension}`;
  const dir = uploadsDirFor(userId);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return NextResponse.json({ id: filename, imageUrl: `/api/images/${filename}` }, { status: 201 });
}
