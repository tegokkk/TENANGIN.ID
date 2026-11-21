import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDate } from '../../lib/date-format.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import { ReflectionJournalIllustration } from '../../assets/illustrations/ExerciseIllustrations.jsx';
import styles from './ReflectionPage.module.css';

export function ReflectionPage() {
  const { user, school } = useAuth();
  const queryClient = useQueryClient();

  const [selectedWeekStart, setSelectedWeekStart] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingVersion, setEditingVersion] = useState(null);
  const [helpful, setHelpful] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [plan, setPlan] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [notice, setNotice] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const loadedCurrentWeekRef = useRef(null);

  const reflectionsQuery = useQuery({
    queryKey: ['reflections', user?.id],
    queryFn: () => apiRequest('/reflections'),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingId) {
        return apiRequest(`/reflections/${editingId}`, {
          method: 'PATCH',
          body: { ...payload, version: editingVersion },
        });
      }
      return apiRequest('/reflections', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reflections', user?.id] });
      setEditingId(res.reflection.id);
      setEditingVersion(res.reflection.version);
      setNotice({ tone: 'success', text: 'Refleksi mingguan berhasil disimpan.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiRequest(`/reflections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflections', user?.id] });
      setConfirmDeleteOpen(false);
      setEditingId(null);
      setEditingVersion(null);
      setSelectedWeekStart(null);
      setHelpful('');
      setObstacle('');
      setPlan('');
      setSelectedTags([]);
      setNotice({ tone: 'info', text: 'Refleksi mingguan dihapus.' });
    },
    onError: (err) => {
      setConfirmDeleteOpen(false);
      setNotice({ tone: 'error', text: err.message });
    },
  });

  const currentWeek = reflectionsQuery.data?.currentWeek;
  const curatedTags = reflectionsQuery.data?.curatedTags || [];
  const list = reflectionsQuery.data?.reflections || [];
  const activeWeekStart = selectedWeekStart || currentWeek?.weekStart;

  useEffect(() => {
    const weekStart = reflectionsQuery.data?.currentWeek?.weekStart;
    if (!weekStart || loadedCurrentWeekRef.current === weekStart) return;
    loadedCurrentWeekRef.current = weekStart;
    if (selectedWeekStart || helpful || obstacle || plan || selectedTags.length) return;
    const existing = reflectionsQuery.data.reflections?.find(
      (item) => item.weekStart === weekStart
    );
    if (!existing) return;
    setEditingId(existing.id);
    setEditingVersion(existing.version);
    setHelpful(existing.helpful);
    setObstacle(existing.obstacle);
    setPlan(existing.plan);
    setSelectedTags(existing.strategyTags || []);
  }, [reflectionsQuery.data, selectedWeekStart, helpful, obstacle, plan, selectedTags.length]);

  function loadWeekIntoForm(item) {
    setSelectedWeekStart(item.weekStart);
    setEditingId(item.id);
    setEditingVersion(item.version);
    setHelpful(item.helpful);
    setObstacle(item.obstacle);
    setPlan(item.plan);
    setSelectedTags(item.strategyTags || []);
    setNotice(null);
  }

  function resetToCurrentWeek() {
    const existing = list.find((item) => item.weekStart === currentWeek?.weekStart);
    if (existing) {
      loadWeekIntoForm(existing);
      setSelectedWeekStart(null);
      return;
    }
    setSelectedWeekStart(null);
    setEditingId(null);
    setEditingVersion(null);
    setHelpful('');
    setObstacle('');
    setPlan('');
    setSelectedTags([]);
    setNotice(null);
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  return (
    <div className={`stack-lg ${styles.canvas}`}>
      <header className="pageHeader">
        {currentWeek && (
          <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
            Minggu {formatIndonesianDate(activeWeekStart, school?.timezone)} –{' '}
            {formatIndonesianDate(currentWeek.weekEnd, school?.timezone)}
          </span>
        )}
        <h1 className="pageTitle">Refleksi Mingguan</h1>
        <p className="pageLead">
          Catat apa yang membantumu, hambatannya, dan satu rencana kecil minggu depan.
        </p>
      </header>

      <div className="infoStrip">
        <ShieldCheck size={16} color="var(--color-primary)" aria-hidden="true" />
        <span>
          Isi refleksi dapat diakses olehmu dan Superadmin. Guru BK hanya melihat ringkasan
          teragregasi (k = 5).
        </span>
      </div>

      <Card className={`stack-md ${styles.editorCard}`}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h2 className="cardTitle">
            {editingId ? `Mengedit Refleksi (${activeWeekStart})` : 'Tiga Pertanyaan Refleksi'}
          </h2>
          {selectedWeekStart && (
            <Button variant="ghost" size="sm" onClick={resetToCurrentWeek}>
              Kembali ke Minggu Ini
            </Button>
          )}
        </div>

        <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate({
              weekStart: activeWeekStart,
              helpful,
              obstacle,
              plan,
              strategyTags: selectedTags,
              version: editingVersion || undefined,
            });
          }}
          className="stack-md"
        >
          <Textarea
            label="1. Apa yang membantumu minggu ini?"
            value={helpful}
            onChange={(e) => setHelpful(e.target.value)}
            maxLength={2000}
            currentLength={helpful.length}
            placeholder="Kebiasaan kecil, jeda istirahat, atau dukungan sekitar..."
            required
          />

          <Textarea
            label="2. Apa hambatannya?"
            value={obstacle}
            onChange={(e) => setObstacle(e.target.value)}
            maxLength={2000}
            currentLength={obstacle.length}
            placeholder="Hal yang terasa berat atau membuat konsentrasimu terganggu..."
            required
          />

          <Textarea
            label="3. Apa rencana kecilmu berikutnya?"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            maxLength={2000}
            currentLength={plan.length}
            placeholder="Satu langkah realistis yang bisa dicoba minggu depan..."
            required
          />

          <div className="stack-sm">
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>
              Strategi yang kamu coba minggu ini (opsional)
            </span>
            <div className="cluster">
              {curatedTags.map((tag) => {
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
          </div>

          <div className={styles.actionBar}>
            {editingId && (
              <Button
                type="button"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>Hapus Refleksi</span>
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              <Save size={18} aria-hidden="true" />
              <span>{saveMutation.isPending ? 'Menyimpan...' : 'Simpan Refleksi'}</span>
            </Button>
          </div>
        </form>
      </Card>

      <section className="stack-md">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <h2 className="sectionTitle">Riwayat Refleksi Mingguan</h2>
          <Badge tone="neutral">{list.length} Refleksi</Badge>
        </div>

        {reflectionsQuery.isLoading ? (
          <LoadingState message="Memuat riwayat refleksi..." />
        ) : reflectionsQuery.isError ? (
          <ErrorState
            message={reflectionsQuery.error.message}
            onRetry={() => reflectionsQuery.refetch()}
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat refleksi"
            description="Setelah kamu menyimpan refleksi mingguan, arsipnya akan tampil di sini."
          />
        ) : (
          <div className={styles.historyGrid}>
            {list.map((item) => (
              <article key={item.id} className={styles.historyCard}>
                <div className="stack-sm">
                  <div className="cluster" style={{ justifyContent: 'space-between' }}>
                    <Badge tone="lavender">
                      {formatIndonesianDate(item.weekStart, school?.timezone)} –{' '}
                      {formatIndonesianDate(item.weekEnd, school?.timezone)}
                    </Badge>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{item.helpful}</p>
                  <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    <strong>Rencana:</strong> {item.plan}
                  </p>
                  {(item.strategyTags || []).length > 0 && (
                    <div className="cluster" style={{ gap: 6 }}>
                      {item.strategyTags.map((tag) => (
                        <Badge key={tag} tone="neutral">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="cluster" style={{ justifyContent: 'space-between' }}>
                  <Button variant="secondary" size="sm" onClick={() => loadWeekIntoForm(item)}>
                    Baca / Edit / Hapus
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Hapus Refleksi Mingguan?"
        description="Refleksi minggu ini akan dihapus dari riwayat pribadimu dan tidak dapat dikembalikan."
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={deleteMutation.isPending}
              onClick={() => editingId && deleteMutation.mutate(editingId)}
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Refleksi'}
            </Button>
          </>
        }
      />
    </div>
  );
}
