import { forwardRef, useId } from 'react';
import styles from './Field.module.css';

export const Select = forwardRef(function Select(
  { label, helperText, error, id, className = '', children, ...props },
  ref
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`${styles.select} ${error ? styles.hasError : ''}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        {...props}
      >
        {children}
      </select>
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
