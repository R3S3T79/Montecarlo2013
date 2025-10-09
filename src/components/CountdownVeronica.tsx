// src/components/CountdownVeronica.tsx
// Data creazione: 09/10/2025 (rev: palloncini ai lati + animazione fluttuante)

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import confetti from "canvas-confetti";

export default function CountdownVeronica() {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ UIDs autorizzati (Veronica + Marco)
      const allowedUIDs = [
        "c87a07f7-a5e5-4df4-8894-76f7998a7547", // Veronica
        "e5f3a7d7-0ebc-4166-8f07-b7ad86f4adfd", // Marco
      ];
      if (!allowedUIDs.includes(user.id)) return;

      setVisible(true);

      const targetMonth = 2; // marzo (0-based)
      const targetDay = 25;
      const now = new Date();
      let next = new Date(now.getFullYear(), targetMonth, targetDay);
      if (next < now) next.setFullYear(now.getFullYear() + 1);

      const updateCountdown = () => {
        const diff = next.getTime() - Date.now();
        if (diff <= 0) {
          setIsBirthday(true);
          setCountdown("🎉 Buon compleanno Veronica! 🎂");
          return;
        }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setCountdown(`${d}g ${h}h ${m}m ${s}s`);
      };

      updateCountdown();
      const int = setInterval(updateCountdown, 1000);
      return () => clearInterval(int);
    };
    init();
  }, []);

  // 🎉 Confetti il giorno del compleanno
  useEffect(() => {
    if (isBirthday) {
      const duration = 4000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 5,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#ff6b81", "#ffc0cb", "#ffb3b3", "#ffd1dc"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [isBirthday]);

  // ✨ Animazione CSS inserita dinamicamente una sola volta
  useEffect(() => {
    if (!document.getElementById("balloon-float-style")) {
      const s = document.createElement("style");
      s.id = "balloon-float-style";
      s.innerHTML = `
        @keyframes floatUpDown {
          0%,100% { transform: translateY(-50%) translateY(0); }
          50% { transform: translateY(-50%) translateY(-10px); }
        }
        .float-left  { animation: floatUpDown 4s ease-in-out infinite; }
        .float-right { animation: floatUpDown 4s ease-in-out infinite 2s; }
      `;
      document.head.appendChild(s);
    }
  }, []);

  if (!visible || !countdown) return null;

  return (
    <div className="relative flex justify-center items-center mt-6 mb-6">
      {/* 🎈 Palloncino sinistro */}
<img
  src="/Palloncini.png"
  alt="Palloncini"
  className="absolute top-1/2 w-20 opacity-90 float-left"
  style={{
    left: "calc(25% - 190px)", // distanza dal centro (più vicino al box)
    transform: "translateY(-50%) scaleX(-1)",
  }}
/>

      {/* 🎈 Palloncino sinistro */}
<img
  src="/Palloncini.png"
  alt="Palloncini"
  className="absolute top-1/2 w-20 opacity-90 float-left"
  style={{
    left: "calc(40% - 190px)", // distanza dal centro (più vicino al box)
    transform: "translateY(-50%) scaleX(-1)",
  }}
/>

{/* 🎈 Palloncino destro */}
<img
  src="/Palloncini.png"
  alt="Palloncini"
  className="absolute top-1/2 w-20 opacity-90 float-right"
  style={{
    right: "calc(25% - 190px)", // distanza simmetrica
    transform: "translateY(-50%)",
  }}
/>

{/* 🎈 Palloncino destro */}
<img
  src="/Palloncini.png"
  alt="Palloncini"
  className="absolute top-1/2 w-20 opacity-90 float-right"
  style={{
    right: "calc(40% - 190px)", // distanza simmetrica
    transform: "translateY(-50%)",
  }}
/>


      {/* 🎂 Box countdown */}
      <div
        className={`relative z-10 text-center p-4 rounded-lg shadow-lg transition-all duration-500 ${
          isBirthday ? "bg-pink-200 animate-pulse" : "bg-pink-100"
        }`}
        style={{ maxWidth: "90%" }}
      >
        <h3 className="font-semibold text-lg text-pink-700">
          🎂 Compleanno Veronica 🎂
        </h3>
        <p
          className={`text-2xl font-bold mt-2 ${
            isBirthday ? "text-pink-700 animate-bounce" : "text-pink-600"
          }`}
        >
          {countdown}
        </p>
      </div>

      
    </div>
  );
}
