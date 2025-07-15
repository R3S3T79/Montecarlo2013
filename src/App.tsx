// src/App.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import SidebarLayout from './components/SidebarLayout';
import { routes } from './routes';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
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

          {/* 404 fallback */}
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
  );
}
