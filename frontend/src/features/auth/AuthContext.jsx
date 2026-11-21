import { createContext, useCallback, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, clearCsrfTokenInMemory, fetchCsrfToken } from '../../lib/api-client.js';
import { notifyServiceWorkerLogout } from '../../lib/pwa.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [locallySignedOut, setLocallySignedOut] = useState(false);

  const publicConfigQuery = useQuery({
    queryKey: ['public', 'config'],
    queryFn: () => apiRequest('/public/config'),
    staleTime: 60_000,
  });

  const sessionQuery = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: () => apiRequest('/auth/session'),
    retry: false,
  });

  const refreshSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    const result = await sessionQuery.refetch();
    if (result.data?.authenticated) setLocallySignedOut(false);
    return result;
  }, [queryClient, sessionQuery]);

  const logout = useCallback(async () => {
    setLocallySignedOut(true);
    await queryClient.cancelQueries();
    try {
      await fetchCsrfToken(false);
      await apiRequest('/auth/logout', { method: 'POST', body: {} });
    } catch {
      // tetap bersihkan cache lokal meski sesi sudah habis di server
    } finally {
      clearCsrfTokenInMemory();
      notifyServiceWorkerLogout();
      queryClient.clear();
      queryClient.setQueryData(['auth', 'session'], { authenticated: false, user: null });
      await queryClient.refetchQueries({ queryKey: ['auth', 'session'] });
      await queryClient.refetchQueries({ queryKey: ['public', 'config'] });
    }
  }, [queryClient]);

  const sessionData = (locallySignedOut ? null : sessionQuery.data) || {
    authenticated: false,
    user: null,
  };
  const value = {
    isLoading: sessionQuery.isLoading,
    authenticated: Boolean(sessionData.authenticated && sessionData.user),
    user: sessionData.user || null,
    mfaVerified: Boolean(sessionData.mfaVerified),
    consentStatus: sessionData.consentStatus || null,
    nextStep: sessionData.nextStep || null,
    school: sessionData.school || publicConfigQuery.data?.school || null,
    appMode: publicConfigQuery.data?.appMode || null,
    refreshSession,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return ctx;
}
