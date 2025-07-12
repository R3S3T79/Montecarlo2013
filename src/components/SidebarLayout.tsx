import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";

export default function SidebarLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = [
    { to: "/", label: "Home" },
    { to: "/risultati", label: "Risultati" },
    { to: "/calendario", label: "Calendario" },
    { to: "/rosa", label: "Rosa Giocatori" },
    { to: "/squadre", label: "Lista Squadre" },
    { to: "/statistiche/squadra", label: "Statistiche Squadra" },
    { to: "/statistiche/giocatori", label: "Statistiche Giocatori" },
    { to: "/prossima-partita", label: "Prossima Partita" },
    { to: "/tornei", label: "Tornei" },
    { to: "/admin", label: "Admin" },
    { to: "/admin-panel", label: "Admin Panel" },
    // Aggiungi qui link per login / register se vuoi esporli nel menu
    { to: "/login", label: "Accedi" },
    { to: "/register", label: "Registrati" },
  ];

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
                    isActive ? "bg-white text-gray-800" : "hover:bg-white/20 hover:backdrop-blur-sm"
                  }`
                }
                onClick={() => setDrawerOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-6 py-4 border-t border-white/20 text-sm">
            <div className="mb-2">Accesso Pubblico</div>
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