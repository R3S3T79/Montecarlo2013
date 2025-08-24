// src/pages/PostAuthSync.tsx
// Data creazione file: 21/08/2025
// Scopo: dopo il redirect del link di invito Supabase, verifica la sessione
//        e sincronizza pending_users.confirmed = true chiamando la function
//        Netlify /.netlify/functions/sync-pending-confirm

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function PostAuthSync(): JSX.Element {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Verifica in corso…");

  useEffect(() => {
    (async () => {
      // 1) Recupera la sessione (dopo redeem dell’invito dovrebbe esistere)
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setMsg("Sessione non trovata. Accedi e riprova.");
        // opzionale: rimanda al login
        // setTimeout(() => navigate("/login"), 1200);
        return;
      }

      try {
        // 2) Chiama la function server per sincronizzare confirmed = true
        const res = await fetch("/.netlify/functions/sync-pending-confirm", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setMsg(`Sync non completata: ${j?.error || res.status}`);
        } else {
          setMsg("Email verificata. Sincronizzazione completata!");
        }
      } catch (e: any) {
        setMsg(`Errore rete: ${e?.message || e}`);
      }

      // 3) Piccolo delay e rientro in home (o dove preferisci)
      setTimeout(() => navigate("/"), 800);
    })();
  }, [navigate]);

  return <div style={{ padding: 16 }}>{msg}</div>;
}
