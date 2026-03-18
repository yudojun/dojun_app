import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../firebase";

function isFirebaseStorageUrl(url) {
  return (
    typeof url === "string" &&
    (url.includes("firebasestorage.googleapis.com") || url.startsWith("gs://"))
  );
}

export async function uploadIssueImage(file, issueId = "temp") {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}.${ext}`;

  const storageRef = ref(storage, `issues/${issueId}/${fileName}`);

  await uploadBytes(storageRef, file);

  const url = await getDownloadURL(storageRef);

  return url;
}

export async function deleteIssueImageByUrl(fileUrl) {
  if (!fileUrl) return false;

  // Firebase Storage URL이 아니면 삭제 시도하지 않음
  if (!isFirebaseStorageUrl(fileUrl)) {
    return false;
  }

  const fileRef = ref(storage, fileUrl);
  await deleteObject(fileRef);
  return true;
}