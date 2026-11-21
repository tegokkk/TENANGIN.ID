import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import styles from './States.module.css';

export function SessionExpiredState() {
  return (
    <div className={`${styles.box} ${styles.centered}`} role="alert">
      <div className={styles.iconCircle}>
        <Lock size={22} aria-hidden="true" />
      </div>
      <h3 className={styles.title}>Sesi telah berakhir</h3>
      <p className={styles.desc}>
        Demi menjaga privasimu, silakan masuk kembali. Bantuan publik tetap dapat diakses tanpa masuk.
      </p>
      <div className="cluster" style={{ justifyContent: 'center' }}>
        <Link to="/masuk" className="btnLinkPrimary">
          Masuk Kembali
        </Link>
        <Link to="/bantuan" className="btnLinkLime">
          Butuh bicara?
        </Link>
      </div>
    </div>
  );
}
