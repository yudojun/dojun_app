import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getAdminDoc } from "../services/adminService";

export default function useAdminAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminOK, setAdminOK] = useState(null);
  const [adminDoc, setAdminDoc] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) {
      setAdminOK(null);
      setAdminDoc(null);
      return;
    }

    setAdminOK(null);

    (async () => {
      try {
        const result = await getAdminDoc(user.uid);
        setAdminOK(result.ok);
        setAdminDoc(result.data);
      } catch (err) {
        console.log("ADMIN DOC READ ERROR:", err.code, err.message);
        setAdminOK(false);
        setAdminDoc(null);
      }
    })();
  }, [user]);

  async function login(email, pw) {
    return signInWithEmailAndPassword(auth, email, pw);
  }

  async function logout() {
    return signOut(auth);
  }

  return {
    user,
    authLoading,
    adminOK,
    adminDoc,
    login,
    logout,
  };
}