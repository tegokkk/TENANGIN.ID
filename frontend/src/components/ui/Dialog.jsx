import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalFocus } from './use-modal-focus.js';
import styles from './Dialog.module.css';

export function Dialog({
  open,
  onClose,
  title,
  description = null,
  children,
  actions = null,
  size = 'md',
  className = '',
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef(null);
  useModalFocus(dialogRef, open, onClose);

  if (!open) return null;

  return createPortal(
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`${styles.dialog} ${styles[size] || styles.md} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Tutup dialog"
          >
            Tutup
          </button>
        </div>
        {description && (
          <p id={descId} className={styles.desc}>
            {description}
          </p>
        )}
        {children && <div className={styles.body}>{children}</div>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>,
    document.body
  );
}
