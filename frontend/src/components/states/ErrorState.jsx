import { AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import styles from './States.module.css';

export function ErrorState({
  title = 'Gagal memuat atau menyimpan data',
  message = 'Terjadi kendala sementara. Isian yang kamu tulis tetap dipertahankan.',
  onRetry = null,
  retryLabel = 'Coba Lagi',
}) {
  return (
    <div className={styles.box} role="alert">
      <div className={`${styles.iconCircle} ${styles.errorCircle}`}>
        <AlertCircle size={22} aria-hidden="true" />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
