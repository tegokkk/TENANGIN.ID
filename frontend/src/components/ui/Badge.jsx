import styles from './Badge.module.css';

export function Badge({ children, tone = 'lavender', className = '' }) {
  return (
    <span className={`${styles.badge} ${styles[tone] || styles.lavender} ${className}`.trim()}>
      {children}
    </span>
  );
}
