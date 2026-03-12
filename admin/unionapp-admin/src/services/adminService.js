import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const COL_ADMINS = "admins";

export async function getAdminDoc(uid) {
  const ref = doc(db, COL_ADMINS, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      ok: false,
      data: null,
    };
  }

  const data = snap.data();
  const ok = data?.active === true && data?.role === "admin";

  return {
    ok,
    data: { id: snap.id, ...data },
  };
}