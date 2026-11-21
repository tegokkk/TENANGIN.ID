import { Outlet } from 'react-router';
import { OfflineBanner } from '../components/states/OfflineBanner.jsx';
import styles from './Layouts.module.css';

export function AuthLayout({ children = null }) {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className="skip-link">
        Langsung ke formulir masuk
      </a>
      <OfflineBanner />
      <main id="main-content" className={styles.authMain}>
        {children || <Outlet />}
      </main>
    </div>
  );
}
