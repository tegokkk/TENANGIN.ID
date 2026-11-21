import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BookOpen, Pause, Play, SkipForward, Square, Volume2, VolumeX, Wind } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatSecondsMMSS } from '../../lib/date-format.js';
import { getExercisePhase } from '../../lib/exercise-timing.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { hasPersonalAccess } from '../../features/auth/personal-access.js';
import { ExerciseVisualIllustration } from '../../assets/illustrations/ExerciseIllustrations.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { AccordionItem } from '../../components/ui/Accordion.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import styles from './TenangPage.module.css';

export function TenangPage() {
  const { authenticated, user, consentStatus } = useAuth();
  const canPersistSession =
    authenticated && user?.role === 'student' && hasPersonalAccess(consentStatus);

  const [selectedSlug, setSelectedSlug] = useState(null);
  const [playerState, setPlayerState] = useState('idle'); // 'idle' | 'playing' | 'paused' | 'completed' | 'stopped'
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [playerNotice, setPlayerNotice] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const lastTickMsRef = useRef(null);
  const activeSecondsRef = useRef(0);
  const phaseOffsetRef = useRef(0);
  const audioRef = useRef(null);

  const exercisesQuery = useQuery({
    queryKey: ['exercises'],
    queryFn: () => apiRequest('/exercises'),
  });

  const articlesQuery = useQuery({
    queryKey: ['articles', searchQuery],
    queryFn: () =>
      apiRequest(
        `/articles${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ''}`
      ),
  });

  const exercises = useMemo(() => exercisesQuery.data?.exercises || [], [exercisesQuery.data]);
  const activeExercise = exercises.find((e) => e.slug === selectedSlug) || exercises[0] || null;

  useEffect(() => {
    if (!selectedSlug && exercises.length > 0) {
      setSelectedSlug(exercises[0].slug);
    }
  }, [exercises, selectedSlug]);

  const startSessionMutation = useMutation({
    mutationFn: (exerciseId) =>
      apiRequest('/exercise-sessions', { method: 'POST', body: { exerciseId } }),
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ id, status, seconds }) =>
      apiRequest(`/exercise-sessions/${id}`, {
        method: 'PATCH',
        body: { status, activeSeconds: seconds },
      }),
    onError: (err) => setPlayerNotice({ tone: 'error', text: err.message }),
  });

  // Timer berbasis selisih timestamp (konsisten termasuk saat perpindahan tab, tanpa autoplay)
  useEffect(() => {
    if (playerState !== 'playing' || !activeExercise) return undefined;

    lastTickMsRef.current = Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.floor((now - lastTickMsRef.current) / 1000);
      if (deltaSec >= 1) {
        lastTickMsRef.current += deltaSec * 1000;
        const nextVal = Math.min(
          activeExercise.durationSeconds,
          activeSecondsRef.current + deltaSec
        );
        activeSecondsRef.current = nextVal;
        setActiveSeconds(nextVal);

        const instructions = activeExercise.instructions || [];
        if (instructions.length > 0) {
          const stepIdx = getExercisePhase(instructions, nextVal + phaseOffsetRef.current).index;
          setPhaseIdx(stepIdx);
        }

        if (nextVal >= activeExercise.durationSeconds) {
          setPlayerState('completed');
          if (sessionId && canPersistSession) {
            updateSessionMutation.mutate({
              id: sessionId,
              status: 'completed',
              seconds: nextVal,
            });
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [playerState, activeExercise, sessionId, canPersistSession]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetPlayer(nextExerciseSlug = null) {
    phaseOffsetRef.current = 0;
    if (nextExerciseSlug) setSelectedSlug(nextExerciseSlug);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioError(false);
    setPlayerState('idle');
    setActiveSeconds(0);
    activeSecondsRef.current = 0;
    setPhaseIdx(0);
    setSessionId(null);
    setPlayerNotice(null);
  }

  async function handleStart() {
    if (!activeExercise) return;
    phaseOffsetRef.current = 0;
    setPlayerNotice(null);
    activeSecondsRef.current = 0;
    setActiveSeconds(0);
    setPhaseIdx(0);

    if (canPersistSession) {
      try {
        const res = await startSessionMutation.mutateAsync(activeExercise.id);
        setSessionId(res.session.id);
      } catch (err) {
        setPlayerNotice({ tone: 'error', text: err.message });
      }
    }
    setPlayerState('playing');
  }

  function handlePauseResume() {
    if (playerState === 'playing') {
      audioRef.current?.pause();
      setPlayerState('paused');
      if (sessionId && canPersistSession) {
        updateSessionMutation.mutate({
          id: sessionId,
          status: 'paused',
          seconds: activeSecondsRef.current,
        });
      }
    } else if (playerState === 'paused') {
      lastTickMsRef.current = Date.now();
      setPlayerState('playing');
      if (sessionId && canPersistSession) {
        updateSessionMutation.mutate({
          id: sessionId,
          status: 'started',
          seconds: activeSecondsRef.current,
        });
      }
    }
  }

  function handleStop() {
    audioRef.current?.pause();
    const finalSeconds = activeSecondsRef.current;
    setPlayerState('stopped');
    if (sessionId && canPersistSession) {
      updateSessionMutation.mutate({
        id: sessionId,
        status: 'stopped',
        seconds: finalSeconds,
      });
    }
  }

  const instructions = activeExercise?.instructions || [];
  const currentInstruction = instructions[phaseIdx] || instructions[0] || null;
  const totalSec = activeExercise?.durationSeconds || 180;
  const remainingSec = Math.max(0, totalSec - activeSeconds);
  const progressRatio = Math.min(1, activeSeconds / totalSec);
  const circumference = 2 * Math.PI * 102;
  const dashOffset = circumference * (1 - progressRatio);

  return (
    <div className="stack-lg">
      <header className="pageHeader">
        <h1 className="pageTitle">Ruang Tenang</h1>
        <p className="pageLead">
          Pilih latihan 3–5 menit. Ikuti panduannya dan berhenti kapan pun kamu perlu.
        </p>
      </header>

      {exercisesQuery.isLoading ? (
        <LoadingState message="Memuat daftar latihan..." />
      ) : exercisesQuery.isError ? (
        <ErrorState
          message={exercisesQuery.error.message}
          onRetry={() => exercisesQuery.refetch()}
        />
      ) : (
        <>
          <div className={styles.cardsGrid}>
            {exercises.length === 0 && (
              <EmptyState
                title="Belum ada latihan terbit"
                description="Pengelola belum menerbitkan panduan latihan."
              />
            )}
            {exercises.map((ex) => {
              const selected = activeExercise?.slug === ex.slug;
              return (
                <button
                  key={ex.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => resetPlayer(ex.slug)}
                  className={`${styles.exerciseCard} ${selected ? styles.exerciseCardActive : ''}`}
                >
                  <div className="stack-sm">
                    <div className="cluster" style={{ justifyContent: 'space-between' }}>
                      <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
                        {ex.subtitle}
                      </span>
                    </div>
                    <h2 className="cardTitle">{ex.title}</h2>
                    <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                      {ex.stopNotice}
                    </p>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-primary-hover)',
                    }}
                  >
                    {selected ? 'Latihan dipilih' : 'Pilih latihan'}
                  </span>
                </button>
              );
            })}
          </div>

          {activeExercise && (
            <Card className={styles.playerCard}>
              <div className="cluster" style={{ justifyContent: 'center' }}>
                <Badge tone="lavender">
                  <Wind size={14} aria-hidden="true" />
                  <span>{activeExercise.title}</span>
                </Badge>
                <Badge tone="neutral">Versi {activeExercise.version}</Badge>
              </div>

              <StatusNotice tone={playerNotice?.tone}>{playerNotice?.text}</StatusNotice>

              {playerState === 'stopped' ? (
                <div className="stack-md" style={{ maxWidth: 520, padding: '16px 0' }}>
                  <h2 className="cardTitle" style={{ fontSize: '1.35rem' }}>
                    Latihan dihentikan. Kamu bisa kembali kapan pun.
                  </h2>
                  <p className="muted-text" style={{ margin: 0 }}>
                    Berhenti saat membutuhkan jeda atau merasa kurang nyaman adalah pilihan yang
                    wajar dan tidak dianggap gagal. Durasi aktifmu:{' '}
                    <strong>{formatSecondsMMSS(activeSeconds)}</strong>.
                  </p>
                  <div className="cluster" style={{ justifyContent: 'center' }}>
                    <Button
                      variant="primary"
                      onClick={handleStart}
                      disabled={startSessionMutation.isPending}
                    >
                      Mulai Lagi Saat Siap
                    </Button>
                    <Button variant="ghost" onClick={() => resetPlayer()}>
                      Kembali ke Tampilan Awal
                    </Button>
                  </div>
                </div>
              ) : playerState === 'completed' ? (
                <div className="stack-md" style={{ maxWidth: 520, padding: '16px 0' }}>
                  <h2 className="cardTitle" style={{ fontSize: '1.35rem' }}>
                    Latihan selesai dengan tenang.
                  </h2>
                  <p className="muted-text" style={{ margin: 0 }}>
                    Terima kasih sudah meluangkan waktu sejenak untuk dirimu (
                    <strong>{formatSecondsMMSS(activeSeconds)}</strong>).
                  </p>
                  <div className="cluster" style={{ justifyContent: 'center' }}>
                    <Button variant="secondary" onClick={() => resetPlayer()}>
                      Siap Kembali
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.ringWrap}>
                    <svg width="244" height="244" viewBox="0 0 244 244" aria-hidden="true">
                      <circle
                        cx="122"
                        cy="122"
                        r="102"
                        fill="none"
                        stroke="var(--color-border)"
                        strokeWidth="12"
                      />
                      <circle
                        cx="122"
                        cy="122"
                        r="102"
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        transform="rotate(-90 122 122)"
                        className={styles.ringProgress}
                      />
                    </svg>
                    <div className={styles.ringCenter}>
                      <span className={styles.timerBig}>{formatSecondsMMSS(remainingSec)}</span>
                      <span className={styles.timerSub}>
                        Aktif: {formatSecondsMMSS(activeSeconds)} / {formatSecondsMMSS(totalSec)}
                      </span>
                      {currentInstruction && <Badge tone="lime">{currentInstruction.phase}</Badge>}
                    </div>
                  </div>

                  {currentInstruction && (
                    <div className={styles.instructionBox} aria-live="polite">
                      <p className={styles.instructionQuote}>
                        &ldquo;{currentInstruction.quote}&rdquo;
                      </p>
                      {currentInstruction.detail && (
                        <p
                          className="muted-text"
                          style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)' }}
                        >
                          {currentInstruction.detail}
                        </p>
                      )}
                    </div>
                  )}

                  <div className={styles.controlsRow}>
                    {playerState === 'idle' ? (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleStart}
                        disabled={startSessionMutation.isPending}
                      >
                        <Play size={18} aria-hidden="true" />
                        <span>Mulai Latihan</span>
                      </Button>
                    ) : (
                      <>
                        <Button variant="primary" onClick={handlePauseResume}>
                          {playerState === 'playing' ? (
                            <>
                              <Pause size={18} aria-hidden="true" />
                              <span>Jeda</span>
                            </>
                          ) : (
                            <>
                              <Play size={18} aria-hidden="true" />
                              <span>Lanjut</span>
                            </>
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const current = getExercisePhase(
                              instructions,
                              activeSecondsRef.current + phaseOffsetRef.current
                            );
                            phaseOffsetRef.current += current.secondsToNext;
                            setPhaseIdx(
                              instructions.length ? (current.index + 1) % instructions.length : 0
                            );
                          }}
                        >
                          <SkipForward size={17} aria-hidden="true" />
                          <span>Langkah Berikutnya</span>
                        </Button>
                        <Button variant="ghost" onClick={handleStop}>
                          <Square size={16} aria-hidden="true" />
                          <span>Berhenti</span>
                        </Button>
                      </>
                    )}
                  </div>

                  <p
                    className="muted-text"
                    style={{ margin: 0, fontSize: 'var(--text-xs)', maxWidth: '65ch' }}
                  >
                    Sumber: {activeExercise.sourceReference} • Hak media:{' '}
                    {activeExercise.mediaRights}
                  </p>

                  <div className={styles.mediaDrawer}>
                    <ExerciseVisualIllustration category={activeExercise.category} width={144} />
                    <div className="cluster" style={{ justifyContent: 'center' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!activeExercise.audioUrl}
                        aria-pressed={audioEnabled}
                        onClick={() => {
                          const next = !audioEnabled;
                          setAudioEnabled(next);
                          if (!next) audioRef.current?.pause();
                          setAudioError(false);
                        }}
                      >
                        {audioEnabled ? (
                          <Volume2 size={16} aria-hidden="true" />
                        ) : (
                          <VolumeX size={16} aria-hidden="true" />
                        )}
                        <span>
                          {activeExercise.audioUrl
                            ? `Audio Panduan: ${audioEnabled ? 'Aktif' : 'Mati'}`
                            : 'Panduan Teks'}
                        </span>
                      </Button>
                    </div>
                    {audioEnabled &&
                      (activeExercise.audioUrl && !audioError ? (
                        <audio
                          ref={audioRef}
                          controls
                          preload="none"
                          src={activeExercise.audioUrl}
                          onError={() => setAudioError(true)}
                          style={{ width: '100%', maxWidth: 380 }}
                        />
                      ) : (
                        <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                          Audio tidak tersedia atau gagal dimuat. Seluruh panduan teks tetap dapat
                          diikuti penuh.
                        </p>
                      ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </>
      )}

      {/* F8: Pustaka Singkat "Baca Sebentar" */}
      <Card tone="muted" className="stack-md">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="cluster">
              <BookOpen size={18} color="var(--color-primary)" aria-hidden="true" />
              <h2 className="cardTitle">Baca Sebentar</h2>
            </div>
            <p
              className="muted-text"
              style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', maxWidth: '65ch' }}
            >
              Bacaan singkat untuk membantu memahami stres dan mengelola emosi.
            </p>
          </div>
        </div>

        <div className={styles.searchBar}>
          <div className={styles.searchField}>
            <Input
              label="Cari judul atau topik pustaka"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="stres, tidur, bantuan..."
            />
          </div>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Reset Pencarian
            </Button>
          )}
        </div>

        {articlesQuery.isLoading ? (
          <LoadingState message="Memuat materi pustaka..." />
        ) : articlesQuery.isError ? (
          <ErrorState
            message={articlesQuery.error.message}
            onRetry={() => articlesQuery.refetch()}
          />
        ) : (articlesQuery.data?.articles || []).length === 0 ? (
          <div className="stack-sm">
            <p style={{ margin: 0, fontWeight: 600 }}>
              Tidak ditemukan materi yang cocok dengan &ldquo;{searchQuery}&rdquo;.
            </p>
            <div className="cluster">
              {(articlesQuery.data?.suggestedTopics || ['stres', 'tidur', 'bantuan']).map(
                (topic) => (
                  <Button
                    key={topic}
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchQuery(topic)}
                  >
                    Coba topik: {topic}
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="stack-sm">
            {articlesQuery.data.articles.map((art, index) => (
              <AccordionItem
                key={art.id}
                title={art.title}
                subtitle={`${art.topic} • Versi ${art.version}`}
                defaultOpen={index === 0 && !searchQuery}
              >
                <div className="stack-sm">
                  <p className={styles.articleBody}>{art.body}</p>
                  <div className={styles.articleMeta}>
                    <span>Sumber: {art.sourceReference}</span>
                    {art.reviewerRef && <span>• Peninjau: {art.reviewerRef}</span>}
                    <span>• Hak pakai: {art.mediaRights}</span>
                  </div>
                </div>
              </AccordionItem>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
