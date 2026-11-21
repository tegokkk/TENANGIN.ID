import emblem from '../brand/emblem.png';
import wordmark from '../brand/wordmark.png';
import logo from '../brand/logo.png';
import styles from './BrandLogo.module.css';

export function BrandLogo({ size = 36 }) {
  return (
    <img
      className={styles.emblem}
      src={emblem}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
    />
  );
}

export function BrandWordmark() {
  return (
    <img className={styles.wordmark} src={wordmark} width="168" height="26" alt="TENANGIN.ID" />
  );
}

export function BrandLockup({ width = 300 }) {
  return (
    <img
      className={styles.lockup}
      src={logo}
      width={width}
      height={Math.round((width * 825) / 1335)}
      alt="TENANGIN.id — Temukan Ketenangan, Kelola Tekanan."
      decoding="async"
    />
  );
}
