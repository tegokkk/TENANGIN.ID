import { Link, NavLink, Outlet } from 'react-router';
import { MessageCircleHeart } from 'lucide-react';
import { BrandLogo, BrandWordmark } from '../assets/illustrations/BrandLogo.jsx';
import { OfflineBanner } from '../components/states/OfflineBanner.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { roleHomePath } from '../guards/role-home.js';
import styles from './Layouts.module.css';

export function PublicLayout({ children = null }) {
  const { authenticated, user } = useAuth();

  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">
        Langsung ke konten utama
      </a>
      <OfflineBanner />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brandGroup}>
            <BrandLogo size={36} />
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>
                <BrandWordmark />
              </span>
              <span className={styles.brandSub}>Pendamping Regulasi Emosi</span>
            </div>
          </Link>

          <nav className={`${styles.desktopNav} ${styles.publicNav}`} aria-label="Navigasi publik">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              Beranda
            </NavLink>
            {authenticated && (
              <NavLink
                to="/pustaka"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                Pustaka
              </NavLink>
            )}
            <Link
              to={authenticated && user ? roleHomePath(user.role) : '/masuk'}
              className={styles.navLink}
            >
              {authenticated && user ? `Masuk ke ${user.accountCode}` : 'Masuk'}
            </Link>
          </nav>

          <div className={styles.actions}>
            <Link to="/bantuan" className={styles.helpCta} aria-label="Butuh bicara?">
              <MessageCircleHeart size={18} aria-hidden="true" />
              <span>Butuh bicara?</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {children || <Outlet />}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <strong>TENANGIN.ID</strong> — Alat bantu layanan BK sekolah.{' '}
            <span>Bukan layanan darurat medis, bukan diagnosis, dan tidak dipantau 24 jam.</span>{' '}
            <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
              Pustaka tersedia setelah masuk akun; catatan pribadimu tidak disimpan di penyimpanan
              browser.
            </span>
          </div>
          <div className={styles.footerLinks}>
            {authenticated && <Link to="/pustaka">Pustaka</Link>}
            <Link to="/bantuan">Informasi Bantuan</Link>
            <Link to="/masuk">Masuk Akun</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
