import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Accordion.module.css';

export function AccordionItem({ title, subtitle = null, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={`${styles.item} ${open ? styles.open : ''}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          {title}
          {subtitle && (
            <span
              style={{
                display: 'block',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                color: 'var(--color-text-secondary)',
                marginTop: 2,
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
        <ChevronDown size={20} className={styles.chevron} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className={styles.panel}>
          {children}
        </div>
      )}
    </div>
  );
}
