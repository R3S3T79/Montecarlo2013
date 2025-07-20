import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function SidebarLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const baseLinks = [
    { to: '/', label: 'Home' },
    { to: '/risultati', label: 'Risultati' },
    { to: '/calendario', label: 'Calendario' },
    { to: '/rosa', label: 'Rosa Giocatori' },
    { to: '/squadre', label: 'Lista Squadre' },
    { to: '/statistiche/squadra', label: 'Statistiche Squadra' },
    { to: '/statistiche/giocatori', label: 'Statistiche Giocatori' },
    { to: '/prossima-partita', label: 'Prossima Partita' },
    { to: '/tornei', label: 'Tornei' },
  ];

  const authLinks = [
    { to: '/login', label: 'Accedi' },
    { to: '/register', label: 'Registrati' },
  ];

  const creatorLinks =
    user?.app_metadata?.role === 'creator' ||
    user?.user_metadata?.role === 'creator'
      ? [
          { to: '/admin', label: 'Admin' },
          { to: '/admin-panel', label: 'Admin Panel' },
        ]
      : [];

  const links = user ? [...baseLinks, ...creatorLinks] : [...baseLinks, ...authLinks];

  return (
    <div className="relative h-screen flex overflow-hidden">
      {/* hamburger */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-4 left-4 z-50 text-white"
        aria-label="Apri menu"
      >
        <Menu size={24} />
      </button>

      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-br from-[#bfb9b9] to-[#6B7280]
          text-white z-40 transform transition-transform duration-200 ease-in-out pt-8
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold">Montecarlo2013</h2>
          </div>
          <nav className="flex-1 overflow-auto px-6 space-y-2">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `block p-2 rounded ${
                    isActive
                      ? 'bg-white text-gray-800'
                      : 'hover:bg-white/20 hover:backdrop-blur-sm'
                  }`
                }
                onClick={() => setDrawerOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="px-6 py-4 border-t border-white/20 text-sm">
            {user ? (
              <div className="flex items-center justify-between">
                <span>{user.user_metadata?.username ?? user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm underline hover:text-gray-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <span>Accesso Pubblico</span>
            )}
          </div>
        </div>
      </aside>

      {/* backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* contenuto */}
      <main
        className={`flex-1 bg-transparent overflow-auto m-0 p-0 transition-all duration-200 ${
          drawerOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
