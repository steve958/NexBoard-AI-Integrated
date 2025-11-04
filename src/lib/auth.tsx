"use client";
import { ReactNode, useEffect, useMemo, useState, createContext, useContext } from "react";
import { ensureUserDocument, getAuthClient, getGoogleProvider } from "@/lib/firebase";
import { onAuthStateChanged, signOut, signInWithPopup, signInWithRedirect, User } from "firebase/auth";

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
      if (u) {
        try {
          await ensureUserDocument(u);
        } catch (e) {
          console.error("ensureUserDocument error", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value: AuthState = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle: async () => {
        try {
          await signInWithPopup(getAuthClient(), getGoogleProvider());
        } catch (err) {
          console.warn("Popup sign-in failed, falling back to redirect", err);
          await signInWithRedirect(getAuthClient(), getGoogleProvider());
        } finally {
          if (typeof window !== "undefined") {
            // Emit GA4 login event if gtag is available
            // @ts-expect-error gtag is an optional global injected by GA
            if (typeof window.gtag === 'function') {
              // @ts-expect-error gtag is an optional global injected by GA
              window.gtag('event', 'login', { method: 'Google' });
            }
          }
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
