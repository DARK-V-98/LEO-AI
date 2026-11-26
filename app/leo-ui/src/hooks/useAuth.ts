"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, firebaseEnabled } from "@/lib/firebase";
import { isDeveloper } from "@/lib/roles";
import { isDashboardAdmin } from "@/lib/dashboardAdmins";

export type AuthStatus = "loading" | "signed-out" | "signed-in" | "unauthorized";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(firebaseEnabled ? "loading" : "signed-out");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setStatus("signed-out");
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setStatus("signed-out");
        return;
      }
      if (isDeveloper(u.email)) {
        setStatus("signed-in");
        return;
      }
      const allowed = await isDashboardAdmin(u.email);
      setStatus(allowed ? "signed-in" : "unauthorized");
    });
  }, []);

  const signIn = useCallback(async () => {
    if (!auth) {
      setError("Sign-in isn't configured — Firebase keys are missing.");
      return;
    }
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  return {
    user,
    status,
    error,
    signIn,
    signOut,
    isDeveloper: isDeveloper(user?.email),
  };
}
