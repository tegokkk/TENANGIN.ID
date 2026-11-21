import { useEffect, useState } from 'react';
import { useBlocker } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Lock, NotebookPen, Save, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDate } from '../../lib/date-format.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { AccordionItem } from '../../components/ui/Accordion.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import { ReflectionJournalIllustration } from '../../assets/illustrations/ExerciseIllustrations.jsx';
import { Disclosure } from '../../components/ui/Disclosure.jsx';
import styles from './JournalPage.module.css';

const EMOTION_TAGS = ['Gelisah', 'Takut', 'Kelelahan', 'Beban berat', 'Bingung', 'Kecewa', 'Lega'];

export function JournalPage() {
  const { user, school } = useAuth();
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);
  const [situation, setSituation] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [feelings, setFeelings] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [alternative, setAlternative] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const blocker = useBlocker(isDirty);

  const [pendingAction, setPendingAction] = useState(null); // { type: 'reset' | 'load', entry?: obj }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const [conflictDetected, setConflictDetected] = useState(false);

  const journalsQuery = useQuery({
    queryKey: ['journals', user?.id],
    queryFn: () => apiRequest('/journals'),
  });

  // Peringatan keluar halaman jika ada perubahan belum tersimpan (hanya di memori halaman, tanpa localStorage)
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingId) {
        return apiRequest(`/journals/${editingId}`, {
          method: 'PATCH',
          body: { ...payload, version: editingVersion },
        });
      }
      return apiRequest('/journals', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['journals', user?.id] });
      setEditingId(res.entry.id);
      setEditingVersion(res.entry.version);
      setIsDirty(false);
      setConflictDetected(false);
      setNotice({
        tone: 'success',
        text: 'Catatan jurnal berhasil disimpan.',
      });
    },
    onError: (err) => {
      if (err?.status === 409) {
        setConflictDetected(true);
      }
      // Pertahankan seluruh teks input di memori saat gagal simpan (F3-AC5)
      setNotice({ tone: 'error', text: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/journals/${id}`, { method: 'DELETE' }),
    onSuccess: (_res, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['journals', user?.id] });
      if (editingId === deletedId) {
        clearFormNow();
      }
      setDeleteTarget(null);
      setNotice({ tone: 'info', text: 'Catatan telah dihapus permanen.' });
    },
    onError: (err) => {
      setDeleteTarget(null);
      setNotice({ tone: 'error', text: err.message });
    },
  });

  function clearFormNow() {
    setEditingId(null);
    setEditingVersion(null);
    setSituation('');
    setThoughts('');
    setFeelings('');
    setSelectedTags([]);
    setAlternative('');
    setIsDirty(false);
    setConflictDetected(false);
  }

  function loadEntryNow(entry) {
    setEditingId(entry.id);
    setEditingVersion(entry.version);
    setSituation(entry.situation);
    setThoughts(entry.thoughts);
    setFeelings(entry.feelings);
    setSelectedTags(entry.emotionTags || []);
    setAlternative(entry.alternative || '');
    setIsDirty(false);
    setConflictDetected(false);
    setNotice(null);
  }

  function requestFormReset() {
    if (isDirty) {
      setPendingAction({ type: 'reset' });
    } else {
      clearFormNow();
    }
  }

  function requestLoadEntry(entry) {
    if (isDirty) {
      setPendingAction({ type: 'load', entry });
    } else {
      loadEntryNow(entry);
    }
  }

  function toggleTag(tag) {
    setIsDirty(true);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function submitForm(e) {
    if (e) e.preventDefault();
    setNotice(null);
    saveMutation.mutate({
      situation,
      thoughts,
      feelings,
      emotionTags: selectedTags,
      alternative,
    });
  }

  const entries = journalsQuery.data?.entries || [];

  return (
    <div className={`stack-lg ${styles.canvas}`}>
      <header className="pageHeader">
        <h1 className="pageTitle">Catat Pikiran &amp; Perasaan</h1>
        <p className="pageLead">Tulis situasi, pikiran, dan perasaanmu. Simpan saat kamu siap.</p>
      </header>

      <div className="infoStrip">
        <Lock size={16} color="var(--color-primary)" aria-hidden="true" />
        <span>
          Catatan dapat diakses olehmu dan Superadmin. BK hanya melihat aktivitas penggunaan.
        </span>
      </div>

      <Card className={`stack-md ${styles.editorCard}`}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div className="cluster">
            <NotebookPen size={20} color="var(--color-primary)" aria-hidden="true" />
            <h2 className="cardTitle">{editingId ? 'Mengedit Catatan Jurnal' : 'Catatan Baru'}</h2>
          </div>
          <div className="cluster">
            {editingVersion && <Badge tone="neutral">Versi {editingVersion}</Badge>}
            {isDirty && <Badge tone="warning">Belum tersimpan ke server</Badge>}
          </div>
        </div>

        <StatusNotice
          tone={notice?.tone}
          action={
            notice?.tone === 'error' && !conflictDetected ? (
              <Button variant="secondary" size="sm" onClick={() => submitForm()}>
                Coba Simpan Lagi
              </Button>
            ) : conflictDetected ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const refreshed = await journalsQuery.refetch();
                  const latest = (refreshed.data?.entries || []).find((x) => x.id === editingId);
                  if (latest) loadEntryNow(latest);
                }}
              >
                Muat Versi Terbaru
              </Button>
            ) : null
          }
        >
          {notice?.text}
        </StatusNotice>

        <form onSubmit={submitForm} className="stack-md">
          <Textarea
            label="1. Apa yang terjadi? (Situasi)"
            value={situation}
            onChange={(e) => {
              setSituation(e.target.value);
              setIsDirty(true);
            }}
            maxLength={2000}
            currentLength={situation.length}
            placeholder="Ada beberapa tugas yang jatuh tempo berdekatan minggu ini..."
            required
          />

          <Textarea
            label="2. Apa yang kamu pikirkan?"
            value={thoughts}
            onChange={(e) => {
              setThoughts(e.target.value);
              setIsDirty(true);
            }}
            maxLength={2000}
            currentLength={thoughts.length}
            placeholder="Tuliskan pikiran yang muncul tanpa perlu menyaringnya..."
            required
          />

          <div className="stack-sm">
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              Pilih label emosi (opsional)
            </span>
            <div className="cluster">
              {EMOTION_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTag(tag)}
                    className={`pillBtn ${active ? 'pillBtnActive' : ''}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <Input
              label="3. Apa yang kamu rasakan?"
              value={feelings}
              onChange={(e) => {
                setFeelings(e.target.value);
                setIsDirty(true);
              }}
              maxLength={2000}
              placeholder="Gelisah, bahu terasa berat, sulit fokus"
              required
            />
          </div>

          <div className="stack-sm">
            <AccordionItem title="Panduan melihat situasi dari sudut pandang lain (opsional)">
              <div className="stack-sm">
                <p style={{ margin: 0 }}>
                  • <strong>Uji fakta:</strong> &ldquo;Bagian mana yang sudah kukerjakan dan bagian
                  mana yang benar-benar perlu bantuan?&rdquo;
                </p>
                <p style={{ margin: 0 }}>
                  • <strong>Fokus langkah kecil:</strong> &ldquo;Aku tidak harus menyelesaikan semua
                  sekaligus; cukup mulai 20 menit untuk bagian pertama.&rdquo;
                </p>
              </div>
            </AccordionItem>

            <Textarea
              label="4. Cara lain melihat situasi ini? (Opsional)"
              value={alternative}
              onChange={(e) => {
                setAlternative(e.target.value);
                setIsDirty(true);
              }}
              maxLength={2000}
              currentLength={alternative.length}
              placeholder="Boleh dikosongkan. Tuliskan sudut pandang yang lebih realistis dan ramah pada diri sendiri."
            />
          </div>

          <div className={styles.actionBar}>
            <Button type="button" variant="ghost" onClick={requestFormReset}>
              {editingId ? 'Buat Catatan Baru' : 'Kosongkan Formulir'}
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              <Save size={18} aria-hidden="true" />
              <span>
                {saveMutation.isPending
                  ? 'Menyimpan...'
                  : editingId
                    ? 'Perbarui Jurnal'
                    : 'Simpan Jurnal'}
              </span>
            </Button>
          </div>
        </form>
      </Card>

      <section className="stack-md">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h2 className="sectionTitle">Catatan Sebelumnya</h2>
          <Badge tone="neutral">{entries.length} Catatan</Badge>
        </div>

        {journalsQuery.isLoading ? (
          <LoadingState message="Memuat catatan sebelummu..." />
        ) : journalsQuery.isError ? (
          <ErrorState
            message={journalsQuery.error.message}
            onRetry={() => journalsQuery.refetch()}
          />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Belum ada catatan tersimpan"
            description="Catatan yang kamu simpan akan muncul di sini dan dapat dibuka atau dihapus kapan saja."
          />
        ) : (
          <div className="stack-sm">
            {entries.map((entry) => (
              <article key={entry.id} className={`stack-sm ${styles.entryCard}`}>
                <div className="cluster" style={{ justifyContent: 'space-between' }}>
                  <div className="cluster">
                    <Badge tone="neutral">
                      {formatIndonesianDate(entry.localDate, school?.timezone)}
                    </Badge>
                    {(entry.emotionTags || []).map((t) => (
                      <Badge key={t} tone="lavender">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="cluster">
                    <Button variant="secondary" size="sm" onClick={() => requestLoadEntry(entry)}>
                      <Edit3 size={15} aria-hidden="true" />
                      <span>Buka &amp; Edit</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label="Hapus catatan"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      <span>Hapus</span>
                    </Button>
                  </div>
                </div>
                <p className={styles.entrySituation}>{entry.situation}</p>
                <Disclosure title="Rincian Catatan">
                  <p className={styles.entryMeta}>
                    <strong>Pikiran:</strong> {entry.thoughts} • <strong>Perasaan:</strong>{' '}
                    {entry.feelings}
                  </p>
                </Disclosure>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Catatan Ini?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          Catatan ini akan dihapus dari ruang pribadimu dan tidak dapat dikembalikan.
        </p>
      </Dialog>

      <Dialog
        open={Boolean(pendingAction) || blocker.state === 'blocked'}
        onClose={() => {
          setPendingAction(null);
          if (blocker.state === 'blocked') blocker.reset();
        }}
        title="Perubahan Belum Disimpan"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPendingAction(null);
                if (blocker.state === 'blocked') blocker.reset();
              }}
            >
              Kembali Mengedit
            </Button>
            <Button
              variant="primary"
              disabled={saveMutation.isPending}
              onClick={async () => {
                try {
                  await saveMutation.mutateAsync({
                    situation,
                    thoughts,
                    feelings,
                    emotionTags: selectedTags,
                    alternative,
                  });
                  setPendingAction(null);
                  if (blocker.state === 'blocked') blocker.proceed();
                } catch {
                  /* Keep the dialog and draft available for retry. */
                }
              }}
            >
              Simpan Perubahan
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const action = pendingAction;
                setPendingAction(null);
                if (blocker.state === 'blocked') {
                  clearFormNow();
                  blocker.proceed();
                } else if (action?.type === 'reset') clearFormNow();
                else if (action?.type === 'load' && action.entry) loadEntryNow(action.entry);
              }}
            >
              Buang Perubahan
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          Kamu memiliki perubahan yang belum disimpan ke server. Ingin menyimpannya terlebih dahulu
          atau membuangnya?
        </p>
      </Dialog>
    </div>
  );
}
