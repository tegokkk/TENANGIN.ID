import { Loader2 } from 'lucide-react';
import styles from './States.module.css';

export function LoadingState({ message = 'Memuat data dengan tenang...' }) {
  return (
    <div className={`${styles.box} ${styles.centered}`} role="status" aria-live="polite">
      <div className={styles.iconCircle}>
        <Loader2 size={24} className="spin" aria-hidden="true" />
      </div>
      <p className={styles.desc}>{message}</p>
    </div>
  );
}
