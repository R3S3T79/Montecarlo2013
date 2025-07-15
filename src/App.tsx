// src/App.tsx
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import { routes } from './routes';            // named import corretto
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SidebarLayout>
          <Routes>
            {routes.map(({ path, element, roles }) => (
              <Route
                key={path}
                path={path}
                element={
                  roles
                    ? <ProtectedRoute roles={roles}>{element}</ProtectedRoute>
                    : element
                }
              />
            ))}

            {/* fallback 404 senza creare file separato */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <h1>404</h1>
                    <p>Pagina non trovata</p>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </SidebarLayout>
      </AuthProvider>
    </Router>
  );
}
