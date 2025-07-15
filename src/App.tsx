// src/App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import routes from './routes';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {routes.map(({ path, element, roles }) => (
            <Route
              key={path}
              path={path}
              element={
                roles
                  // se ho ruoli definiti, proteggi
                  ? <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
                  // altrimenti rende semplicemente la pagina (es. login/register)
                  : element
              }
            />
          ))}
          {/* fallback 404 */}
          <Route path="*" element={<ProtectedRoute><NotFoundPage/></ProtectedRoute>} />
        </Routes>
        {/* SidebarLayout potresti spostarlo dentro le pagine protette se vuoi nasconderlo a login/register */}
      </AuthProvider>
    </Router>
  );
}
