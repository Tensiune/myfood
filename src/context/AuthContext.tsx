"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Use onAuthStateChange as the primary source of truth.
    // The INITIAL_SESSION event will trigger automatically on modern Supabase versions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[Auth] Event: ${event}`);
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // If we're still in the initial loading state, mark it as finished
      setLoading(false);
    });

    // Fallback: If for some reason the listener doesn't fire INITIAL_SESSION immediately,
    // we fetch it once to ensure we don't hang in loading state.
    const checkInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
        }
      } catch (error) {
        console.error("Initial session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('active_role');
    setSession(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return context;
};