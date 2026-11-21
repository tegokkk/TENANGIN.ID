import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import styles from './Toast.module.css';

export function StatusNotice({ tone = 'info', children, action = null }) {
  if (!children) return null;
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? AlertCircle : Info;

  return (
    <div
      className={`${styles.banner} ${styles[tone] || styles.info}`}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className={styles.content}>
        <Icon size={18} aria-hidden="true" className={styles.icon} />
        <span>{children}</span>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
