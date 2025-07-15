// src/components/SidebarLayout.tsx

import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function SidebarLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // the always-visible links
  const baseLinks = [
    { to: "/", label: "Home" },
    { to: "/risultati", label: "Risultati" },
    { to: "/calendario", label: "Calendario" },
    { to: "/rosa", label: "Rosa Giocatori" },
    { to: "/squadre", label: "Lista Squadre" },
    { to: "/statistiche/squadra", label: "Statistiche Squadra" },
    { to: "/statistiche/giocatori", label: "Statistiche Giocatori" },
    { to: "/prossima-partita", label: "Prossima Partita" },
    { to: "/tornei", label: "Tornei" },
  ];

  // only for creators
  const creatorLinks = [
    { to: "/admin", label: "Admin" },
    { to: "/admin-panel", label: "Admin Panel" },
  ];

  // public auth-links
  const publicLinks = [
    { to: "/login", label: "Accedi" },
    { to: "/register", label: "Registrati" },
  ];

  // build final array
  let links = [...baseLinks];
  if (user) {
    if (user.user_metadata.role === "creator") {
      links = links.concat(creatorLinks);
    }
  } else {
    links = links.concat(publicLinks);
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
    setDrawerOpen(false);
  };

  // display the part before the "@" as a pseudo-username
  const displayName = user?.email.split("@")[0] ?? "";

  return (
    <div className="relative h-screen flex overflow-hidden">
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-4 left-4 z-30 text-white"
        aria-label="Apri menu"
      >
        <Menu size={24} />
      </button>

      <aside
        className={`
          fixed inset-y-0 left-0 w-64 bg-gradient-to-br from-[#bfb9b9] to-[#6B7280] text-white z-40
          transform transition-transform duration-200 ease-in-out
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
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
                      ? "bg-white text-gray-800"
                      : "hover:bg-white/20 hover:backdrop-blur-sm"
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
              <div className="flex justify-between items-center">
                <span>{displayName}</span>
                <button
                  onClick={handleLogout}
                  className="underline hover:text-gray-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div>Accesso Pubblico</div>
            )}
          </div>
        </div>
      </aside>

      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <main className="flex-1 bg-transparent overflow-auto m-0 p-0">
        <Outlet />
      </main>
    </div>
  );
}

