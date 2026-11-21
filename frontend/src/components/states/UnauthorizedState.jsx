import { Link } from 'react-router';
import { ShieldAlert } from 'lucide-react';
import styles from './States.module.css';

export function UnauthorizedState({
  title = 'Akses tidak diizinkan',
  message = 'Halaman ini tidak tersedia untuk peran akunmu.',
}) {
  return (
    <div className={`${styles.box} ${styles.centered}`} role="alert">
      <div className={`${styles.iconCircle} ${styles.errorCircle}`}>
        <ShieldAlert size={22} aria-hidden="true" />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{message}</p>
      <div className="cluster" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btnLink">
          Kembali ke Beranda
        </Link>
        <Link to="/bantuan" className="btnLinkLime">
          Butuh bicara?
        </Link>
      </div>
    </div>
  );
}
