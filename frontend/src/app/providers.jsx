import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from '../features/auth/AuthContext.jsx';
import { createAppQueryClient } from './query-client.js';

export function AppProviders({ children }) {
  const [queryClient] = useState(() => createAppQueryClient());
  const [router] = useState(() =>
    createBrowserRouter([{ path: '*', element: <AuthProvider>{children}</AuthProvider> }])
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
