import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { BookOpenCheck, Home, MessageCircleHeart, NotebookPen, Wind } from 'lucide-react';
import { BrandLogo, BrandWordmark } from '../assets/illustrations/BrandLogo.jsx';
import { OfflineBanner } from '../components/states/OfflineBanner.jsx';
import { AccountSettingsPanel } from '../components/navigation/AccountSettingsPanel.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import styles from './Layouts.module.css';

const STUDENT_MENUS = [
  { to: '/app', label: 'Beranda', icon: Home, end: true },
  { to: '/app/tenang', label: 'Tenang', icon: Wind },
  { to: '/app/catat', label: 'Catat', icon: NotebookPen },
  { to: '/app/refleksi', label: 'Refleksi', icon: BookOpenCheck },
  { to: '/app/bantuan', label: 'Bantuan', icon: MessageCircleHeart },
];

export function StudentLayout({ children = null }) {
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className={`${styles.shell} ${styles.dashboardShell}`}>
      <a href="#main-content" className="skip-link">
        Langsung ke konten utama
      </a>
      <OfflineBanner />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/app" className={styles.brandGroup}>
            <BrandLogo size={36} />
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>
                <BrandWordmark />
              </span>
              <span className={styles.brandSub}>Ruang Siswa</span>
            </div>
          </Link>

          <nav className={styles.desktopNav} aria-label="Menu utama siswa">
            {STUDENT_MENUS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.accountBtn}
              aria-label={`Buka pengaturan akun ${user?.accountCode || ''}`.trim()}
              onClick={() => setAccountOpen(true)}
            >
              <span className={styles.accountAvatar}>
                {(user?.accountCode || 'S').slice(0, 1).toUpperCase()}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: 96,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Akun
              </span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className={`${styles.main} ${styles.mainWithBottomNav}`}>
        {children || <Outlet />}
      </main>

      <nav className={styles.bottomNav} aria-label="Navigasi bawah siswa">
        {STUDENT_MENUS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${styles.bottomLink} ${isActive ? styles.bottomLinkActive : ''}`
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <AccountSettingsPanel open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
