// src/Hooks/useScrollRestoration.ts
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

/**
 * Ripristina la posizione di scroll quando `ready` diventa true.
 * Usa una chiave stabile (di default: path+search).
 */
export function useScrollRestoration(ready: boolean, keyOverride?: string) {
  const location = useLocation();
  const storageKey = useMemo(
    () => keyOverride ?? `scroll-${location.pathname}${location.search}`,
    [keyOverride, location.pathname, location.search]
  );

  // Salva allo smontaggio
  useEffect(() => {
    return () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };
  }, [storageKey]);

  // Ripristina solo quando la pagina è pronta
  useEffect(() => {
    if (!ready) return;
    const savedY = sessionStorage.getItem(storageKey);
    if (!savedY) return;
    // aspetta il frame successivo (DOM pronto)
    requestAnimationFrame(() => {
      window.scrollTo(0, parseFloat(savedY));
    });
  }, [ready, storageKey]);
}
