import { Link } from 'react-router';
import { ArrowRight, BookOpen } from 'lucide-react';
import styles from './FigmaBrandHero.module.css';

const CORNER_CLASSES = [styles.handleTL, styles.handleTR, styles.handleBL, styles.handleBR];

export function FigmaBrandHero({
  pillLabel = 'Pendamping Regulasi Emosi & Belajar • SMA/MA',
  lines = {
    top1: 'Pelan-pelan,',
    top2: 'kamu boleh',
    highlight: 'ambil jeda.',
    bottom: 'Di ruang tenang.',
  },
  description = 'Ruang digital sederhana untuk siswa SMA/MA mengenali kondisi diri, mencatat pikiran secara terstruktur, berlatih menenangkan diri, dan terhubung dengan layanan sekolah.',
  primaryCtaTo = '/masuk',
  primaryCtaLabel = 'Mulai dengan tenang',
  secondaryCtaHref = '#cara-kerja',
  secondaryCtaLabel = 'Pelajari cara kerja',
  replayLabel = 'KENALI. CATAT. LATIH.',
  cursorRight = { name: 'Ruang Siswa', action: 'Cek suasana hati' },
  cursorLeft = { name: 'Ruang Tenang', action: 'Jeda 3 menit' },
}) {
  return (
    <section className={styles.heroCanvas} aria-label="Pengantar utama TENANGIN.ID">
      <div className={styles.ambientGlow} aria-hidden="true" />
      <div className={styles.ambientGlowGreen} aria-hidden="true" />

      {/* Top Status Pill */}
      <div className={styles.topBar}>
        <div className={styles.topPill}>
          <span className={styles.pulseDot} aria-hidden="true" />
          <span>{pillLabel}</span>
        </div>
      </div>

      {/* Main Bold Figma-style Typography Stack (statis) */}
      <h1 className={styles.headlineStack}>
        <span className="sr-only">
          {[lines.top1, lines.top2, lines.highlight, lines.bottom].filter(Boolean).join(' ')}
        </span>
        <span aria-hidden="true" className={styles.headlineLine}>
          {lines.top1}
        </span>
        <span aria-hidden="true" className={styles.headlineLine}>
          {lines.top2}
        </span>

        {/* Highlighted Bounding Box Row with 4 Figma-style Corner Handles */}
        <span aria-hidden="true" className={styles.boundingRow}>
          <span aria-hidden="true" className={styles.boundingFill} />
          {CORNER_CLASSES.map((cornerClass) => (
            <span
              key={cornerClass}
              aria-hidden="true"
              className={`${styles.handle} ${cornerClass}`}
            />
          ))}
          <span className={`${styles.headlineLine} ${styles.boundingText}`}>
            {lines.highlight}
          </span>
        </span>

        {lines.bottom && (
          <span aria-hidden="true" className={styles.headlineLine}>
            {lines.bottom}
          </span>
        )}
      </h1>

      <p className={styles.subtitle}>{description}</p>

      <div className={styles.ctaRow}>
        <Link to={primaryCtaTo} className="btnLinkPrimary">
          <span>{primaryCtaLabel}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <a href={secondaryCtaHref} className={styles.secondaryCta}>
          <BookOpen size={17} aria-hidden="true" />
          <span>{secondaryCtaLabel}</span>
        </a>
      </div>

      {/* Static Cursor Badge 1 (Top Right) */}
      <div aria-hidden="true" className={`${styles.cursorTag} ${styles.cursorTopRight}`}>
        <svg className={styles.cursorSvg} viewBox="0 0 24 24" fill="var(--color-primary)">
          <path d="M5.653 3.125a1 1 0 0 1 1.34-1.34l14.5 9.5a1 1 0 0 1 .046 1.705l-6.046 4.031-2.915 5.83a1 1 0 0 1-1.745.18l-3.5-5.5-5.228-2.614a1 1 0 0 1-.107-1.792l14.002-9.335z" />
        </svg>
        <div className={`${styles.cursorBadge} ${styles.cursorBadgeGreen}`}>
          <span>{cursorRight.name}</span>
          <span className={styles.cursorSub}>{cursorRight.action}</span>
        </div>
      </div>

      {/* Static Cursor Badge 2 (Bottom Left) */}
      <div aria-hidden="true" className={`${styles.cursorTag} ${styles.cursorBottomLeft}`}>
        <svg className={styles.cursorSvg} viewBox="0 0 24 24" fill="var(--color-success)">
          <path d="M5.653 3.125a1 1 0 0 1 1.34-1.34l14.5 9.5a1 1 0 0 1 .046 1.705l-6.046 4.031-2.915 5.83a1 1 0 0 1-1.745.18l-3.5-5.5-5.228-2.614a1 1 0 0 1-.107-1.792l14.002-9.335z" />
        </svg>
        <div className={`${styles.cursorBadge} ${styles.cursorBadgeEmerald}`}>
          <span>{cursorLeft.name}</span>
          <span className={styles.cursorSub}>{cursorLeft.action}</span>
        </div>
      </div>

      {/* Bottom Tagline Pill */}
      <div className={styles.taglinePill}>
        <span>{replayLabel}</span>
      </div>
    </section>
  );
}

export default FigmaBrandHero;
