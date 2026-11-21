import { useState } from 'react';
import { Link, Outlet } from 'react-router';
import { Eye, MessageCircleHeart } from 'lucide-react';
import { BrandLogo, BrandWordmark } from '../assets/illustrations/BrandLogo.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { OfflineBanner } from '../components/states/OfflineBanner.jsx';
import { AccountSettingsPanel } from '../components/navigation/AccountSettingsPanel.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import styles from './Layouts.module.css';

export function CounselorLayout({ children = null }) {
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">
        Langsung ke Dashboard BK
      </a>
      <OfflineBanner />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/bk" className={styles.brandGroup}>
            <BrandLogo size={36} />
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>
                <BrandWordmark />
              </span>
              <span className={styles.brandSub}>Pemantauan Read-Only</span>
            </div>
          </Link>

          <div className={styles.actions}>
            <Badge tone="lavender">
              <Eye size={14} aria-hidden="true" />
              <span>Akses pemantauan (Read-Only)</span>
            </Badge>
            <Link to="/bantuan" className={styles.helpCta} aria-label="Info Bantuan">
              <MessageCircleHeart size={18} aria-hidden="true" />
              <span>Info Bantuan</span>
            </Link>
            <button
              type="button"
              className={styles.accountBtn}
              aria-label={`Pengaturan akun BK ${user?.accountCode || ''}`.trim()}
              onClick={() => setAccountOpen(true)}
            >
              <span className={styles.accountAvatar}>BK</span>
              <span>{user?.accountCode}</span>
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
