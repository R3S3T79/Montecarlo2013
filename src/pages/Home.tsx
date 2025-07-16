// src/pages/Home.tsx
import React, { useEffect } from 'react';
import backgroundImage from '../assets/StemmaMontecarlo.jpg';

export default function Home() {
  useEffect(() => {
    console.log('[Home] renderizzato');
  }, []);

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
          {/* Welcome text */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            Benvenuto!
          </h1>
          <p className="text-xl md:text-2xl text-montecarlo-light mb-8 drop-shadow-md">
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
