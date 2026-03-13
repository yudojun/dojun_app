import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const COL_ADMINS = "admins";
const ALLOWED_ROLES = ["viewer", "editor", "super_admin"];

export async function getAdminDoc(uid) {
  const ref = doc(db, COL_ADMINS, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return {
      ok: false,
      data: null,
    };
  }

  const data = snap.data() || {};
  const role = data.role || null;
  const isActive = data.active === true;
  const hasValidRole = ALLOWED_ROLES.includes(role);

  return {
    ok: isActive && hasValidRole,
    data: { id: snap.id, ...data },
  };
}