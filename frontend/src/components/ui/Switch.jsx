import { useId } from 'react';
import styles from './Switch.module.css';

export function Switch({ checked, onChange, label, id, disabled = false }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <label htmlFor={inputId} className={styles.wrap}>
      {label && <span>{label}</span>}
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </label>
  );
}
