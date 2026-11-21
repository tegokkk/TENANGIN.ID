import { useState } from 'react';
import { Link } from 'react-router';
import { motion as Motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen, RotateCw } from 'lucide-react';
import { BrandLockup } from '../../assets/illustrations/BrandLogo.jsx';
import styles from './FigmaBrandHero.module.css';

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
const CORNER_CLASSES = [styles.handleTL, styles.handleTR, styles.handleBL, styles.handleBR];

function JumpableLine({
  text,
  lineId,
  reducedMotion,
  jumpState,
  onTriggerJump,
  trailingSpace = true,
}) {
  const words = text.split(' ');
  let charCursor = 0;

  return (
    <>
      {words.map((word, wordIdx) => {
        const letters = Array.from(word);
        const startIdx = charCursor;
        charCursor += letters.length + 1;

        return (
          <span key={`${lineId}-w-${wordIdx}`} className={styles.wordGroup}>
            {letters.map((ch, offset) => {
              const idx = startIdx + offset;
              const isTriggeredLine = jumpState.lineId === lineId && jumpState.nonce > 0;
              const distance = isTriggeredLine ? Math.abs(idx - jumpState.originIdx) : 0;
              const shouldRipple = isTriggeredLine && distance <= 7;
              const amplitude = Math.max(8, 22 - distance * 2.2);
              const tilt = distance === 0 ? -7 : idx < jumpState.originIdx ? -4 : 4;

              return (
                <Motion.span
                  key={`${lineId}-${idx}-${shouldRipple ? jumpState.nonce : 0}`}
                  className={styles.charSpan}
                  onClick={() => onTriggerJump(lineId, idx)}
                  whileHover={reducedMotion ? undefined : { y: -5, scale: 1.08 }}
                  animate={
                    shouldRipple && !reducedMotion
                      ? {
                          y: [0, -amplitude, 4, -amplitude * 0.25, 0],
                          scale: [1, 1.15, 0.94, 1.04, 1],
                          rotate: [0, tilt, -tilt * 0.5, 0],
                        }
                      : { y: 0, scale: 1, rotate: 0 }
                  }
                  transition={
                    shouldRipple && !reducedMotion
                      ? {
                          duration: 0.58,
                          delay: distance * 0.035,
                          ease: [0.22, 1, 0.36, 1],
                        }
                      : { type: 'spring', stiffness: 460, damping: 22 }
                  }
                >
                  {ch}
                </Motion.span>
              );
            })}
            {wordIdx < words.length - 1 ? ' ' : trailingSpace ? ' ' : ''}
          </span>
        );
      })}
    </>
  );
}

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
  const [animationKey, setAnimationKey] = useState(0);
  const [jumpState, setJumpState] = useState({ lineId: null, originIdx: 0, nonce: 0 });
  const prefersReducedMotion = useReducedMotion();

  const handleReplay = () => {
    setJumpState({ lineId: null, originIdx: 0, nonce: 0 });
    setAnimationKey((prev) => prev + 1);
  };

  const triggerJump = (lineId, originIdx) => {
    setJumpState((prev) => ({
      lineId,
      originIdx,
      nonce: prev.nonce + 1,
    }));
  };

  const highlightPopping = jumpState.lineId === 'highlight' && jumpState.nonce > 0;

  return (
    <section
      key={animationKey}
      className={styles.heroCanvas}
      aria-label="Pengantar utama TENANGIN.ID"
    >
      <div className={styles.ambientGlow} aria-hidden="true" />
      <div className={styles.ambientGlowGreen} aria-hidden="true" />

      <div className={styles.brandLockup}>
        <BrandLockup width={320} />
      </div>

      {/* Top Status Pill */}
      <Motion.div
        initial={prefersReducedMotion ? false : { y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        className={styles.topBar}
      >
        <div className={styles.topPill}>
          <span className={styles.pulseDot} aria-hidden="true" />
          <span>{pillLabel}</span>
        </div>
      </Motion.div>

      {/* Main Bold Figma-style Typography Stack (klik huruf/kata untuk melompat) */}
      <h1 className={styles.headlineStack} title="Klik teks untuk melihat huruf melompat">
        <span className="sr-only">
          {[lines.top1, lines.top2, lines.highlight, lines.bottom].filter(Boolean).join(' ')}
        </span>
        <Motion.span
          aria-hidden="true"
          className={styles.headlineLine}
          initial={prefersReducedMotion ? false : { y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.65, delay: 0.12, ease: EASE_OUT_EXPO }}
        >
          <JumpableLine
            text={lines.top1}
            lineId="top1"
            reducedMotion={prefersReducedMotion}
            jumpState={jumpState}
            onTriggerJump={triggerJump}
          />
        </Motion.span>
        <Motion.span
          aria-hidden="true"
          className={styles.headlineLine}
          initial={prefersReducedMotion ? false : { y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.65, delay: 0.22, ease: EASE_OUT_EXPO }}
        >
          <JumpableLine
            text={lines.top2}
            lineId="top2"
            reducedMotion={prefersReducedMotion}
            jumpState={jumpState}
            onTriggerJump={triggerJump}
          />
        </Motion.span>

        {/* Highlighted Bounding Box Row with 4 Figma-style Corner Handles */}
        <Motion.span
          aria-hidden="true"
          key={`bbox-${highlightPopping ? jumpState.nonce : 0}`}
          className={styles.boundingRow}
          animate={
            highlightPopping && !prefersReducedMotion
              ? { scale: [1, 1.045, 0.985, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.42, ease: EASE_OUT_EXPO }}
        >
          <Motion.span
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.32, ease: EASE_OUT_EXPO }}
            className={styles.boundingFill}
          />
          {CORNER_CLASSES.map((cornerClass, idx) => (
            <Motion.span
              key={cornerClass}
              aria-hidden="true"
              initial={prefersReducedMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.35,
                delay: 0.65 + idx * 0.07,
                ease: EASE_OUT_EXPO,
              }}
              className={`${styles.handle} ${cornerClass}`}
            />
          ))}
          <span className={`${styles.headlineLine} ${styles.boundingText}`}>
            <JumpableLine
              text={lines.highlight}
              lineId="highlight"
              reducedMotion={prefersReducedMotion}
              jumpState={jumpState}
              onTriggerJump={triggerJump}
            />
          </span>
        </Motion.span>

        {lines.bottom && (
          <Motion.span
            aria-hidden="true"
            className={styles.headlineLine}
            initial={prefersReducedMotion ? false : { y: 22, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.65, delay: 0.44, ease: EASE_OUT_EXPO }}
          >
            <JumpableLine
              text={lines.bottom}
              lineId="bottom"
              reducedMotion={prefersReducedMotion}
              jumpState={jumpState}
              onTriggerJump={triggerJump}
              trailingSpace={false}
            />
          </Motion.span>
        )}
      </h1>

      <Motion.p
        className={styles.subtitle}
        initial={prefersReducedMotion ? false : { y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.52, ease: EASE_OUT_EXPO }}
      >
        {description}
      </Motion.p>

      <Motion.div
        className={styles.ctaRow}
        initial={prefersReducedMotion ? false : { y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.58, ease: EASE_OUT_EXPO }}
      >
        <Link to={primaryCtaTo} className="btnLinkPrimary">
          <span>{primaryCtaLabel}</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <a href={secondaryCtaHref} className={styles.secondaryCta}>
          <BookOpen size={17} aria-hidden="true" />
          <span>{secondaryCtaLabel}</span>
        </a>
      </Motion.div>

      {/* Multiplayer Cursor 1 (Top Right) */}
      <Motion.div
        aria-hidden="true"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85, x: 18 }}
        animate={
          prefersReducedMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, x: [0, 8, -4, 0], y: [0, -6, 3, 0] }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                opacity: { duration: 0.75, delay: 0.55, ease: EASE_OUT_EXPO },
                scale: { duration: 0.75, delay: 0.55, ease: EASE_OUT_EXPO },
                x: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              }
        }
        className={`${styles.cursorTag} ${styles.cursorTopRight}`}
      >
        <svg className={styles.cursorSvg} viewBox="0 0 24 24" fill="var(--color-primary)">
          <path d="M5.653 3.125a1 1 0 0 1 1.34-1.34l14.5 9.5a1 1 0 0 1 .046 1.705l-6.046 4.031-2.915 5.83a1 1 0 0 1-1.745.18l-3.5-5.5-5.228-2.614a1 1 0 0 1-.107-1.792l14.002-9.335z" />
        </svg>
        <div className={`${styles.cursorBadge} ${styles.cursorBadgeGreen}`}>
          <span>{cursorRight.name}</span>
          <span className={styles.cursorSub}>{cursorRight.action}</span>
        </div>
      </Motion.div>

      {/* Multiplayer Cursor 2 (Bottom Left) */}
      <Motion.div
        aria-hidden="true"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.85, x: -18 }}
        animate={
          prefersReducedMotion
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, x: [0, -8, 6, 0], y: [0, 8, -4, 0] }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                opacity: { duration: 0.75, delay: 0.65, ease: EASE_OUT_EXPO },
                scale: { duration: 0.75, delay: 0.65, ease: EASE_OUT_EXPO },
                x: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
                y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
              }
        }
        className={`${styles.cursorTag} ${styles.cursorBottomLeft}`}
      >
        <svg className={styles.cursorSvg} viewBox="0 0 24 24" fill="var(--color-success)">
          <path d="M5.653 3.125a1 1 0 0 1 1.34-1.34l14.5 9.5a1 1 0 0 1 .046 1.705l-6.046 4.031-2.915 5.83a1 1 0 0 1-1.745.18l-3.5-5.5-5.228-2.614a1 1 0 0 1-.107-1.792l14.002-9.335z" />
        </svg>
        <div className={`${styles.cursorBadge} ${styles.cursorBadgeEmerald}`}>
          <span>{cursorLeft.name}</span>
          <span className={styles.cursorSub}>{cursorLeft.action}</span>
        </div>
      </Motion.div>

      {/* Bottom Action Badge (Triggers Replay) */}
      <Motion.button
        type="button"
        initial={prefersReducedMotion ? false : { y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.65, delay: 0.64, ease: EASE_OUT_EXPO }}
        onClick={handleReplay}
        className={styles.replayBtn}
        title="Klik untuk memutar ulang animasi"
      >
        <span>{replayLabel}</span>
        <RotateCw size={13} aria-hidden="true" />
      </Motion.button>
    </section>
  );
}

export default FigmaBrandHero;
