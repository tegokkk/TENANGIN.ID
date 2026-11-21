export function ExerciseVisualIllustration({ category, width = 128 }) {
  if (category === 'muscle_relaxation') {
    return (
      <figure
        style={{
          margin: 0,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg
          width={width}
          height={Math.round(width * 0.72)}
          viewBox="0 0 160 115"
          fill="none"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="144" height="99" rx="22" fill="#edf4ee" />
          <path
            d="M40 82C46 56 62 44 80 44C98 44 114 56 120 82"
            stroke="#195654"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="80" cy="30" r="12" fill="#195654" />
          <path
            d="M36 52C31 58 29 66 30 74"
            stroke="#a1bf7a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M124 52C129 58 131 66 130 74"
            stroke="#a1bf7a"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M58 92H102" stroke="#90b99a" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <figcaption
          className="muted-text"
          style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}
        >
          Ilustrasi bahu turun perlahan saat otot dilemaskan
        </figcaption>
      </figure>
    );
  }

  if (category === 'mindfulness') {
    return (
      <figure
        style={{
          margin: 0,
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg
          width={width}
          height={Math.round(width * 0.72)}
          viewBox="0 0 160 115"
          fill="none"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="144" height="99" rx="22" fill="#edf4ee" />
          <circle cx="80" cy="58" r="34" fill="#FFFFFF" stroke="#90b99a" strokeWidth="3" />
          <circle cx="80" cy="58" r="20" fill="#a1bf7a" fillOpacity="0.65" />
          <circle cx="80" cy="58" r="8" fill="#195654" />
          <path d="M34 32L37 37L42 39L37 41L34 46L31 41L26 39L31 37L34 32Z" fill="#195654" />
          <path
            d="M126 70L128.5 74L133 75.5L128.5 77L126 81L123.5 77L119 75.5L123.5 74L126 70Z"
            fill="#195654"
          />
        </svg>
        <figcaption
          className="muted-text"
          style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}
        >
          Ilustrasi pusat perhatian grounding di momen saat ini
        </figcaption>
      </figure>
    );
  }

  return (
    <figure
      style={{
        margin: 0,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <svg
        width={width}
        height={Math.round(width * 0.72)}
        viewBox="0 0 160 115"
        fill="none"
        aria-hidden="true"
      >
        <rect x="8" y="8" width="144" height="99" rx="22" fill="#edf4ee" />
        <path
          d="M28 62C42 48 56 48 70 62C84 76 98 76 112 62C120 54 128 52 134 55"
          stroke="#195654"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M28 46C42 32 56 32 70 46C84 60 98 60 112 46C120 38 128 36 134 39"
          stroke="#a1bf7a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="80" cy="84" r="7" fill="#195654" />
      </svg>
      <figcaption
        className="muted-text"
        style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}
      >
        Ilustrasi ritme napas masuk dan hembusan lembut 4-4-4
      </figcaption>
    </figure>
  );
}

export function ReflectionJournalIllustration({ kind = 'journal' }) {
  const isReflection = kind === 'reflection';
  return (
    <div aria-hidden="true" style={{ flexShrink: 0 }}>
      <svg width="72" height="56" viewBox="0 0 72 56" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="68" height="52" rx="14" fill="#edf4ee" />
        {isReflection ? (
          <>
            <circle cx="36" cy="28" r="14" fill="#a1bf7a" />
            <path
              d="M27 28L33 34L45 22"
              stroke="#243c33"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            <rect
              x="18"
              y="12"
              width="36"
              height="32"
              rx="6"
              fill="#FFFFFF"
              stroke="#195654"
              strokeWidth="2.5"
            />
            <path
              d="M25 22H47M25 29H43M25 36H38"
              stroke="#90b99a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="52" cy="14" r="6" fill="#a1bf7a" />
          </>
        )}
      </svg>
    </div>
  );
}
