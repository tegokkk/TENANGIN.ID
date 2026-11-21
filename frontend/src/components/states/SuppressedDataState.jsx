import { ShieldCheck } from 'lucide-react';
import styles from './States.module.css';

export function SuppressedDataState({
  title = 'Data belum cukup untuk ditampilkan',
  description = 'Ringkasan kelompok ditahan otomatis bila jumlah peserta berbeda kurang dari ambang minimum (k = 5).',
}) {
  return (
    <div className={styles.suppressed}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700,
          fontSize: 'var(--text-sm)',
          color: 'var(--color-primary-hover)',
        }}
      >
        <ShieldCheck size={18} aria-hidden="true" color="var(--color-primary)" />
        <span>{title}</span>
      </div>
      <p className={styles.desc}>{description}</p>
    </div>
  );
}
