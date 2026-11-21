import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { StudentLayout } from '../layouts/StudentLayout.jsx';
import { CounselorLayout } from '../layouts/CounselorLayout.jsx';
import { SuperadminLayout } from '../layouts/SuperadminLayout.jsx';
import { RequireAuth, RequireConsent, RequireMfa, RequireRole } from '../guards/RouteGuards.jsx';
import { LandingPage } from '../pages/public/LandingPage.jsx';
import { HelpPage } from '../pages/public/HelpPage.jsx';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { StudentConsentPanel } from '../features/auth/StudentConsentPanel.jsx';
import { HomePage } from '../pages/student/HomePage.jsx';
import { TenangPage } from '../pages/student/TenangPage.jsx';
import { JournalPage } from '../pages/student/JournalPage.jsx';
import { ReflectionPage } from '../pages/student/ReflectionPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { LoadingState } from '../components/states/LoadingState.jsx';

// Lazy-load heavier staff dashboards so students never download staff bundles
const CounselorDashboardPage = lazy(() =>
  import('../pages/counselor/DashboardPage.jsx').then((m) => ({
    default: m.CounselorDashboardPage,
  }))
);
const SuperadminDashboardPage = lazy(() =>
  import('../pages/superadmin/DashboardPage.jsx').then((m) => ({
    default: m.SuperadminDashboardPage,
  }))
);

export function AppRouter() {
  return (
    <Routes>
      {/* Rute Publik */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/pustaka"
          element={
            <RequireAuth>
              <RequireMfa>
                <TenangPage />
              </RequireMfa>
            </RequireAuth>
          }
        />
        <Route path="/bantuan" element={<HelpPage />} />
      </Route>

      {/* Login, pendaftaran siswa, pemulihan, dan MFA opsional staf */}
      <Route element={<AuthLayout />}>
        <Route path="/masuk" element={<LoginPage />} />
        <Route path="/login" element={<Navigate to="/masuk" replace />} />
        <Route path="/daftar" element={<LoginPage />} />
        <Route path="/aktivasi" element={<Navigate to="/daftar" replace />} />
        <Route path="/pemulihan" element={<LoginPage />} />
        <Route path="/persetujuan" element={<Navigate to="/app/persetujuan" replace />} />
      </Route>

      {/* Ruang Siswa (D02-D06) */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole allowedRoles={['student']} />}>
          <Route element={<StudentLayout />}>
            <Route element={<RequireConsent />}>
              <Route path="/app" element={<HomePage />} />
              <Route path="/app/catat" element={<JournalPage />} />
              <Route path="/app/refleksi" element={<ReflectionPage />} />
            </Route>
            <Route path="/app/tenang" element={<TenangPage />} />
            <Route path="/app/pustaka" element={<TenangPage />} />
            <Route path="/app/bantuan" element={<HelpPage />} />
            <Route path="/app/persetujuan" element={<StudentConsentPanel />} />
          </Route>
        </Route>

        {/* Ruang BK Read-Only (D07) */}
        <Route element={<RequireRole allowedRoles={['bk']} />}>
          <Route element={<RequireMfa />}>
            <Route element={<CounselorLayout />}>
              <Route
                path="/bk"
                element={
                  <Suspense fallback={<LoadingState message="Memuat dasbor Guru BK..." />}>
                    <CounselorDashboardPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>

        {/* Ruang Superadmin Akses Penuh (D08) */}
        <Route element={<RequireRole allowedRoles={['superadmin']} />}>
          <Route element={<RequireMfa />}>
            <Route element={<SuperadminLayout />}>
              <Route
                path="/superadmin"
                element={
                  <Suspense fallback={<LoadingState message="Memuat dasbor Superadmin..." />}>
                    <SuperadminDashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<LoadingState message="Memuat dasbor Superadmin..." />}>
                    <SuperadminDashboardPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
