import styles from './Button.module.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  className = '',
  ...props
}) {
  const classes = [
    styles.btn,
    styles[variant] || styles.primary,
    size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : '',
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
