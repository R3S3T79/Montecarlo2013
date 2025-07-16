import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function SidebarLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
- const { user } = useAuth();
+ const { user, loading } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/#/login";
  };

  // ... link logic invariato

  return (
    <div className="relative h-screen flex overflow-hidden">
      {/* sidebar e overlay invariati */}

      <main className="flex-1 bg-transparent overflow-auto m-0 p-0">
-       <Outlet />
+       {/*
+         Forziamo il remount dell'Outlet al cambiare di loading/user,
+         così React lo renderizza di nuovo e mostra la rotta corretta.
+       */}
+       <Outlet key={`${loading}-${user?.id ?? "anon"}`} />
      </main>
    </div>
  );
}
