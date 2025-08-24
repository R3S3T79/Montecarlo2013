// src/context/AuthContext.tsx
// Data: 21/08/2025 - aggiornato con redirect automatico su /update-password

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[AuthContext] mount – loading iniziale:", loading);

    // recupera la sessione iniziale
    supabase.auth.getSession().then(({ data }) => {
      console.log("[AuthContext] getSession →", data.session);
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // listener sugli eventi auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[AuthContext] onAuthStateChange", event, s);
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);

      // redirect automatico al reset password
      if (event === "PASSWORD_RECOVERY") {
        console.log("[AuthContext] redirect → /update-password (PASSWORD_RECOVERY)");
        navigate("/update-password");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
