import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Disclosure.module.css';

export function Disclosure({ title, subtitle, children, defaultOpen = false, className = '' }) {
  const id = useId();
  return (
    <details className={`${styles.disclosure} ${className}`.trim()} open={defaultOpen || undefined}>
      <summary aria-controls={id}>
        <span>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      <div id={id} className={styles.content}>
        {children}
      </div>
    </details>
  );
}
