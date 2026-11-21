import { Inbox } from 'lucide-react';
import styles from './States.module.css';

export function EmptyState({
  title = 'Belum ada data',
  description = 'Kamu bisa mulai mengisi kapan pun siap.',
  action = null,
}) {
  return (
    <div className={`${styles.box} ${styles.centered}`}>
      <div className={styles.iconCircle}>
        <Inbox size={22} aria-hidden="true" />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.desc}>{description}</p>
      {action}
    </div>
  );
}
