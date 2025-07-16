// src/routes.tsx

// …import e altre rotte…

export const routes = [
  // pubbliche
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/confirm',  element: <ConfirmPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },

  // **HOME PROTETTA**
  {
    path: '/',
    element: (
      <ProtectedRoute roles={[UserRole.Authenticated]}>
        <Home />
      </ProtectedRoute>
    )
  },

  // tutte le altre come prima…
];
