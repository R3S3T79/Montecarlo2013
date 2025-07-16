import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] mount – loading iniziale:", loading);
    supabase.auth.getSession().then(({ data }) => {
      console.log("[AuthContext] getSession →", data.session);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      console.log("[AuthContext] loading dopo getSession:", false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[AuthContext] onAuthStateChange", event, s);
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      console.log("[AuthContext] loading dopo evento:", false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
