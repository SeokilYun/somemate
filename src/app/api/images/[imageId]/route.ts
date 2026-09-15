import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { apiError } from "@/lib/api-error";
import { getCurrentUserId } from "@/lib/session";
import { isSafeImageId, mimeTypeForExtension, uploadsDirFor } from "@/lib/images";

export async function GET(_req: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError(401, "UNAUTHENTICATED", "로그인이 필요합니다.");
  }

  const { imageId } = await params;
  if (!isSafeImageId(imageId)) {
    return apiError(404, "NOT_FOUND", "이미지를 찾을 수 없습니다.");
  }

  const filePath = path.join(uploadsDirFor(userId), imageId);

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return apiError(404, "NOT_FOUND", "이미지를 찾을 수 없습니다.");
    }
  } catch {
    return apiError(404, "NOT_FOUND", "이미지를 찾을 수 없습니다.");
  }

  const buffer = await readFile(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeTypeForExtension(path.extname(imageId)),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
