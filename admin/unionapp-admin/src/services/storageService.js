import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function sanitizeFileName(name) {
  return String(name || "image")
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]/g, "");
}

export function validateImageFile(file) {
  if (!file) {
    throw new Error("업로드할 파일이 없습니다.");
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("jpg, png, webp, gif 형식의 이미지만 업로드할 수 있습니다.");
  }

  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`이미지 용량은 ${MAX_IMAGE_SIZE_MB}MB 이하만 가능합니다.`);
  }
}

export async function uploadIssueImage(file, tab = "public", uid = "admin") {
  validateImageFile(file);

  const now = Date.now();
  const safeName = sanitizeFileName(file.name);
  const folder = tab === "private" ? "issues/private" : "issues/public";
  const path = `${folder}/${uid}/${now}_${safeName}`;

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return {
    url: downloadURL,
    path,
    name: safeName,
  };
}