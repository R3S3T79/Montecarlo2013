// src/pages/Home.tsx

import React from 'react';
import backgroundImage from '../assets/StemmaMontecarlo.jpg';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const username =
    user?.user_metadata?.username ??
    user?.user_metadata?.full_name ??
    user?.email ??
    'Utente';

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background con overlay gradient */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-montecarlo-secondary/80 via-montecarlo-neutral/60 to-montecarlo-secondary/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center px-6">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-2 drop-shadow-lg">
            Benvenuto
          </h1>
          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 drop-shadow-lg">
            {username}
          </h2>
          <p className="text-xl md:text-2xl text-white drop-shadow-md">
            Montecarlo 2013
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-montecarlo-accent/20 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-montecarlo-neutral/20 rounded-full blur-xl"></div>
    </div>
  );
}
