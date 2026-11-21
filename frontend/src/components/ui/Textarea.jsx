import { forwardRef, useId } from 'react';
import styles from './Field.module.css';

export const Textarea = forwardRef(function Textarea(
  { label, helperText, error, id, maxLength, currentLength, className = '', ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
          {typeof maxLength === 'number' && typeof currentLength === 'number' && (
            <span className={styles.helper}>
              {currentLength} / {maxLength} karakter
            </span>
          )}
        </div>
      )}
      <textarea
        ref={ref}
        id={inputId}
        maxLength={maxLength}
        className={`${styles.textarea} ${error ? styles.hasError : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={helperId} className={styles.helper}>
          {helperText}
        </span>
      )}
    </div>
  );
});
