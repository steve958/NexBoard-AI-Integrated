"use client";
import { ReactNode, useEffect, useMemo, useState, createContext, useContext } from "react";
import { ensureUserDocument, getAuthClient, getGoogleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signOut, signInWithPopup, User } from "firebase/auth";
import { useRouter } from "next/navigation";

export type AuthState = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), async (u) => {
      setUser(u);
      if (u) await ensureUserDocument(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value: AuthState = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        await signInWithPopup(getAuthClient(), getGoogleProvider());
        if (typeof window !== "undefined") {
          console.log("analytics:event", { name: "auth_login" });
        }
      },
      signOutUser: async () => {
        await signOut(getAuthClient());
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { user: null, loading: true, signInWithGoogle: async () => {}, signOutUser: async () => {} };
  }
  return ctx;
}
