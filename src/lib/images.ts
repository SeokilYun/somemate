import path from "node:path";

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGES_PER_MESSAGE = 5;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extensionForMimeType(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null;
}

export function mimeTypeForExtension(ext: string): string {
  const entry = Object.entries(MIME_TO_EXT).find(([, value]) => value === ext);
  return entry?.[0] ?? "application/octet-stream";
}

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/** 사용자별로 격리된 업로드 디렉터리(AGENTS.md: "사용자 ID로 경로 격리"). */
export function uploadsDirFor(userId: string): string {
  return path.join(UPLOADS_ROOT, userId);
}

/**
 * URL 경로 세그먼트로 들어오는 imageId가 저장 시 생성한 형식(uuid+허용 확장자)과
 * 정확히 일치하는지 검증한다. "..", "/" 등 경로 탈출 문자는 전부 걸러진다.
 */
export function isSafeImageId(imageId: string): boolean {
  return /^[a-zA-Z0-9-]+\.(jpg|png|webp|gif)$/.test(imageId);
}
