// src/App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import { routes } from './routes';                // <-- named import
import { ProtectedRoute } from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';   // <-- assicurati di avere questa pagina

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
                  // se ci sono ruoli, incapsula in ProtectedRoute
                  ? <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
                  // altrimenti rende semplicemente la pagina (es. login/register)
                  : element
              }
            />
          ))}

          {/* fallback 404 */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <NotFoundPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
