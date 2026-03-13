import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export async function uploadIssueImage(file, issueId = "temp") {
  if (!file) return null;

  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}.${ext}`;

  const storageRef = ref(storage, `issues/${issueId}/${fileName}`);

  await uploadBytes(storageRef, file);

  const url = await getDownloadURL(storageRef);

  return url;
}