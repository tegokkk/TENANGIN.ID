import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { LoadingState } from '../components/states/LoadingState.jsx';
import { UnauthorizedState } from '../components/states/UnauthorizedState.jsx';
import { StudentConsentPanel } from '../features/auth/StudentConsentPanel.jsx';
import { hasPersonalAccess } from '../features/auth/personal-access.js';

export function RequireAuth({ children }) {
  const { isLoading, authenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState message="Memeriksa sesi akun..." />;
  if (!authenticated) {
    return <Navigate to="/masuk" state={{ from: location.pathname }} replace />;
  }
  return children || <Outlet />;
}

export function RequireRole({ allowedRoles, children }) {
  const { isLoading, authenticated, user } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!authenticated || !user) return <Navigate to="/masuk" replace />;
  if (!allowedRoles.includes(user.role)) {
    return (
      <UnauthorizedState
        title="Halaman tidak tersedia untuk peranmu"
        message={`Akunmu berstatus ${user.role}. Kamu tidak dapat membuka halaman milik peran lain.`}
      />
    );
  }
  return children || <Outlet />;
}

export function RequireMfa({ children }) {
  const { isLoading, authenticated, user, mfaVerified } = useAuth();
  if (isLoading) return <LoadingState />;
  if (!authenticated || !user) return <Navigate to="/masuk" replace />;
  if ((user.role === 'bk' || user.role === 'superadmin') && user.mfaEnabled && !mfaVerified) {
    return <Navigate to="/masuk?step=mfa" replace />;
  }
  return children || <Outlet />;
}

export function RequireConsent({ children }) {
  const { isLoading, authenticated, user, consentStatus } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState />;
  if (!authenticated || !user) return <Navigate to="/masuk" replace />;
  if (user.role === 'student' && !hasPersonalAccess(consentStatus)) {
    return <StudentConsentPanel welcome={location.pathname === '/app'} />;
  }
  return children || <Outlet />;
}
