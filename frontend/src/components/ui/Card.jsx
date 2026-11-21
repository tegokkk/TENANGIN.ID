import styles from './Card.module.css';

export function Card({ children, tone = 'default', className = '', as: Tag = 'section', ...props }) {
  const toneClass = tone !== 'default' ? styles[tone] : '';
  return (
    <Tag className={`${styles.card} ${toneClass} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
