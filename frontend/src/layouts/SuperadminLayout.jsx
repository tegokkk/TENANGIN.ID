import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { BrandLogo, BrandWordmark } from '../assets/illustrations/BrandLogo.jsx';
import { OfflineBanner } from '../components/states/OfflineBanner.jsx';
import { AccountSettingsPanel } from '../components/navigation/AccountSettingsPanel.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import styles from './Layouts.module.css';

export function SuperadminLayout({ children = null }) {
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className={`${styles.shell} ${styles.dashboardShell}`}>
      <a href="#main-content" className="skip-link">
        Langsung ke Dashboard Superadmin
      </a>
      <OfflineBanner />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/superadmin" className={styles.brandGroup}>
            <BrandLogo size={34} />
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>
                <BrandWordmark />
              </span>
              <span className={styles.brandSub}>Superadmin</span>
            </div>
          </Link>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.accountBtn}
              aria-label={`Pengaturan akun Superadmin ${user?.accountCode || ''}`.trim()}
              onClick={() => setAccountOpen(true)}
            >
              <span className={styles.accountAvatar}>SA</span>
              <span>Akun</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {children || <Outlet />}
      </main>

      <AccountSettingsPanel open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
