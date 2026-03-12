import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

export const COL_PUBLIC = "issues_public";
export const COL_PRIVATE = "issues_private";

export function getIssueCollection(tab) {
  return tab === "public" ? COL_PUBLIC : COL_PRIVATE;
}

export function subscribeIssues(tab, onData, onError) {
  const col = getIssueCollection(tab);
  const q = query(collection(db, col), orderBy("order", "asc"));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(rows);
    },
    onError
  );
}

export async function createIssue(tab, payload) {
  const col = getIssueCollection(tab);

  return addDoc(collection(db, col), {
    ...payload,
    deleted: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function updateIssue(tab, issueId, payload) {
  const col = getIssueCollection(tab);
  return updateDoc(doc(db, col, issueId), {
    ...payload,
    updated_at: serverTimestamp(),
  });
}

export async function softDeleteIssue(tab, issueId) {
  const col = getIssueCollection(tab);
  return updateDoc(doc(db, col, issueId), {
    deleted: true,
    deleted_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function restoreIssue(tab, issueId) {
  const col = getIssueCollection(tab);
  return updateDoc(doc(db, col, issueId), {
    deleted: false,
    deleted_at: null,
    updated_at: serverTimestamp(),
  });
}

export async function hardDeleteIssue(tab, issueId) {
  const col = getIssueCollection(tab);
  return deleteDoc(doc(db, col, issueId));
}

export async function changeIssueStatus(tab, issueId, nextStatus) {
  const col = getIssueCollection(tab);
  return updateDoc(doc(db, col, issueId), {
    status: nextStatus,
    updated_at: serverTimestamp(),
  });
}

export async function reorderIssues(tab, issues) {
  const col = getIssueCollection(tab);
  const batch = writeBatch(db);

  issues.forEach((it, index) => {
    batch.update(doc(db, col, it.id), {
      order: index + 1,
      updated_at: serverTimestamp(),
    });
  });

  return batch.commit();
}