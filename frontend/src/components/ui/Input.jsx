import { forwardRef, useId } from 'react';
import styles from './Field.module.css';

export const Input = forwardRef(function Input(
  { label, helperText, error, id, className = '', rightElement = null, ...props },
  ref
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`${styles.field} ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.inputWrap}>
        <input
          ref={ref}
          id={inputId}
          className={`${styles.input} ${rightElement ? styles.inputWithRight : ''} ${error ? styles.hasError : ''}`.trim()}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {rightElement}
      </div>
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
