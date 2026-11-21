import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageCircleHeart,
  NotebookPen,
  Plus,
  SlidersHorizontal,
  Wind,
} from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDate } from '../../lib/date-format.js';
import { urlBase64ToUint8Array } from '../../lib/pwa.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import { Disclosure } from '../../components/ui/Disclosure.jsx';
import styles from './HomePage.module.css';

const MOODS = [
  { code: 'very_heavy', label: 'Sangat Berat', hint: 'Perlu jeda' },
  { code: 'anxious_tired', label: 'Cemas / Lelah', hint: 'Beban tinggi' },
  { code: 'neutral', label: 'Biasa Saja', hint: 'Netral' },
  { code: 'calm_relieved', label: 'Tenang / Lega', hint: 'Napas lega' },
  { code: 'energized', label: 'Bersemangat', hint: 'Penuh energi' },
];

const WEEKDAYS = [
  { num: 1, label: 'Sen' },
  { num: 2, label: 'Sel' },
  { num: 3, label: 'Rab' },
  { num: 4, label: 'Kam' },
  { num: 5, label: 'Jum' },
  { num: 6, label: 'Sab' },
  { num: 7, label: 'Min' },
];

const QUICK_ACTIVITIES = [
  {
    to: '/app/tenang',
    title: 'Tenang',
    desc: 'Latihan napas & jeda 3 menit',
    icon: Wind,
  },
  {
    to: '/app/catat',
    title: 'Catat',
    desc: 'Tulis pikiran & perasaan',
    icon: NotebookPen,
  },
  {
    to: '/app/refleksi',
    title: 'Refleksi',
    desc: 'Evaluasi mingguan & rencana kecil',
    icon: BookOpenCheck,
  },
  {
    to: '/app/bantuan',
    title: 'Bantuan',
    desc: 'Layanan BK & kontak sekolah',
    icon: MessageCircleHeart,
  },
];

export function HomePage() {
  const { user, school } = useAuth();
  const queryClient = useQueryClient();

  // === MOOD STATE ===
  const [selectedMood, setSelectedMood] = useState('calm_relieved');
  const [pressureLevel, setPressureLevel] = useState(4);
  const [moodNotice, setMoodNotice] = useState(null);

  const moodsQuery = useQuery({
    queryKey: ['moods', user?.id],
    queryFn: () => apiRequest('/moods'),
  });

  useEffect(() => {
    const entry = moodsQuery.data?.todayEntry;
    if (entry) {
      if (MOODS.some((mood) => mood.code === entry.moodCode)) setSelectedMood(entry.moodCode);
      if (entry.pressureLevel !== null && entry.pressureLevel !== undefined) {
        setPressureLevel(entry.pressureLevel);
      }
    }
  }, [moodsQuery.data]);

  const saveMoodMutation = useMutation({
    mutationFn: (payload) => apiRequest('/moods', { method: 'POST', body: payload }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['moods', user?.id] });
      setMoodNotice({
        tone: 'success',
        text: vars.skipped
          ? 'Cek suasana hati dilewati untuk hari ini.'
          : 'Tersimpan untuk hari ini.',
      });
    },
    onError: (err) => {
      setMoodNotice({ tone: 'error', text: err.message });
    },
  });

  // === PLANNER & REST BLOCKS ===
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskMinutes, setTaskMinutes] = useState('');
  const [taskImportant, setTaskImportant] = useState(false);
  const [taskUrgent, setTaskUrgent] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [taskOptionsOpen, setTaskOptionsOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [stepDrafts, setStepDrafts] = useState({});
  const [rescheduleDates, setRescheduleDates] = useState({});
  const [plannerNotice, setPlannerNotice] = useState(null);
  const [restEditorOpen, setRestEditorOpen] = useState(false);
  const [blockNotice, setBlockNotice] = useState(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState(null);

  const [blockType, setBlockType] = useState('rest');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockStart, setBlockStart] = useState('16:30');
  const [blockEnd, setBlockEnd] = useState('16:45');

  const tasksQuery = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => apiRequest('/tasks'),
  });

  const blocksQuery = useQuery({
    queryKey: ['schedule-blocks', user?.id],
    queryFn: () => apiRequest('/schedule-blocks'),
  });

  const createTaskMutation = useMutation({
    mutationFn: (payload) => apiRequest('/tasks', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      setTaskEditorOpen(false);
      setTaskTitle('');
      setTaskDate('');
      setTaskMinutes('');
      setTaskImportant(false);
      setTaskUrgent(false);
      setTaskOptionsOpen(false);
      setPlannerNotice({ tone: 'success', text: 'Tugas ditambahkan ke rencana.' });
    },
    onError: (err) => setPlannerNotice({ tone: 'error', text: err.message }),
  });

  const patchTaskMutation = useMutation({
    mutationFn: ({ id, payload }) => apiRequest(`/tasks/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    },
    onError: (err) => setPlannerNotice({ tone: 'error', text: err.message }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      setDeleteTaskTarget(null);
      setPlannerNotice({ tone: 'info', text: 'Tugas dan langkahnya dihapus.' });
    },
    onError: (err) => {
      setDeleteTaskTarget(null);
      setPlannerNotice({ tone: 'error', text: err.message });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: ({ taskId, title }) =>
      apiRequest(`/tasks/${taskId}/steps`, { method: 'POST', body: { title } }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
      setStepDrafts((prev) => ({ ...prev, [vars.taskId]: '' }));
    },
    onError: (err) => setPlannerNotice({ tone: 'error', text: err.message }),
  });

  const toggleStepMutation = useMutation({
    mutationFn: ({ taskId, stepId, isDone }) =>
      apiRequest(`/tasks/${taskId}/steps/${stepId}`, {
        method: 'PATCH',
        body: { isDone },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] }),
    onError: (err) => setPlannerNotice({ tone: 'error', text: err.message }),
  });

  const createBlockMutation = useMutation({
    mutationFn: (payload) => apiRequest('/schedule-blocks', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-blocks', user?.id] });
      setBlockTitle('');
      setRestEditorOpen(false);
      setBlockNotice({ tone: 'success', text: 'Blok istirahat/tidur disimpan.' });
    },
    onError: (err) => setPlannerNotice({ tone: 'error', text: err.message }),
  });

  const deleteBlockMutation = useMutation({
    mutationFn: (id) => apiRequest(`/schedule-blocks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedule-blocks', user?.id] }),
    onError: (err) => setBlockNotice({ tone: 'error', text: err.message }),
  });

  // === REMINDERS & FEEDBACK ===
  const remindersQuery = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => apiRequest('/reminders'),
  });
  const dueReminderQuery = useQuery({
    queryKey: ['reminders-due', user?.id],
    queryFn: () => apiRequest('/reminders/due'),
  });
  const feedbackQuery = useQuery({
    queryKey: ['group-feedback', user?.id],
    queryFn: () => apiRequest('/group-feedback'),
  });

  const [remState, setRemState] = useState(null);
  const [remScheduleOpen, setRemScheduleOpen] = useState(false);
  const [remDraft, setRemDraft] = useState(null);
  const [remNotice, setRemNotice] = useState(null);
  const [pushNotice, setPushNotice] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const pushStatusQuery = useQuery({
    queryKey: ['reminders-push-status', user?.id],
    queryFn: () => apiRequest('/reminders/push/status'),
  });

  async function handleEnablePush() {
    setPushBusy(true);
    setPushNotice(null);
    try {
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window)
      ) {
        setPushNotice({
          tone: 'info',
          text: 'Browser ini belum mendukung Web Push eksternal. Pengingat dalam aplikasi tetap aktif.',
        });
        return;
      }

      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        setPushNotice({
          tone: 'info',
          text: 'Izin notifikasi ditolak di browser. Pengaturan ini selalu sukarela dan dapat diubah kapan saja.',
        });
        return;
      }

      const vapidKey = pushStatusQuery.data?.vapidPublicKey;
      if (!vapidKey) {
        setPushNotice({ tone: 'error', text: 'Kunci VAPID server belum tersedia.' });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      const subJson = subscription.toJSON();
      await apiRequest('/reminders/push/subscriptions', {
        method: 'POST',
        body: {
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh || '',
            auth: subJson.keys?.auth || '',
          },
          userAgentLabel: navigator.userAgent?.slice(0, 60) || 'Browser Perangkat Ini',
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['reminders-push-status', user?.id] });
      setPushNotice({
        tone: 'success',
        text: 'Perangkat terdaftar untuk push notification eksternal dengan isi netral.',
      });
    } catch (err) {
      setPushNotice({
        tone: 'info',
        text:
          err?.message ||
          'Langganan push tidak tersedia di browser ini; pengingat dalam aplikasi tetap berjalan.',
      });
    } finally {
      setPushBusy(false);
    }
  }

  async function handleRevokePush(subId) {
    setPushBusy(true);
    setPushNotice(null);
    try {
      await apiRequest(`/reminders/push/subscriptions/${subId}`, { method: 'DELETE' });
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const currentSub = await reg?.pushManager?.getSubscription();
        await currentSub?.unsubscribe().catch(() => {});
      }
      await queryClient.invalidateQueries({ queryKey: ['reminders-push-status', user?.id] });
      setPushNotice({ tone: 'info', text: 'Langganan push perangkat ini telah dicabut.' });
    } catch (err) {
      setPushNotice({ tone: 'error', text: err.message });
    } finally {
      setPushBusy(false);
    }
  }

  async function handleTestPush(forceDeviceCheck = false) {
    setPushBusy(true);
    setPushNotice(null);
    try {
      const res = await apiRequest('/reminders/push/test', {
        method: 'POST',
        body: { forceDeviceCheck },
      });
      setPushNotice({
        tone: res.skippedQuietHours ? 'info' : 'success',
        text: res.message,
      });
    } catch (err) {
      setPushNotice({ tone: 'error', text: err.message });
    } finally {
      setPushBusy(false);
    }
  }

  useEffect(() => {
    if (remindersQuery.data?.preference) {
      setRemState(remindersQuery.data.preference);
    }
  }, [remindersQuery.data]);

  const saveReminderMutation = useMutation({
    mutationFn: (payload) => apiRequest('/reminders', { method: 'PUT', body: payload }),
    onSuccess: (res) => {
      setRemState(res.preference);
      queryClient.invalidateQueries({ queryKey: ['reminders', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['reminders-due', user?.id] });
      setRemScheduleOpen(false);
      setRemNotice({ tone: 'success', text: 'Preferensi pengingat disimpan.' });
    },
    onError: (err) => setRemNotice({ tone: 'error', text: err.message }),
  });

  // === OPTIONAL SCREENING ===
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [screeningAnswers, setScreeningAnswers] = useState({});
  const [screeningResult, setScreeningResult] = useState(null);
  const [screeningNotice, setScreeningNotice] = useState(null);

  const screeningQuery = useQuery({
    queryKey: ['screening-active', user?.id],
    queryFn: () => apiRequest('/screening/active'),
    enabled: screeningOpen,
  });

  const submitScreeningMutation = useMutation({
    mutationFn: (payload) => apiRequest('/screening/responses', { method: 'POST', body: payload }),
    onSuccess: (res) => {
      setScreeningResult(res.response);
      setScreeningNotice(null);
    },
    onError: (err) => setScreeningNotice({ tone: 'error', text: err.message }),
  });

  const todayLocal = moodsQuery.data?.todayLocalDate || '';
  const tasks = tasksQuery.data?.tasks || [];
  const orderedTasks = [...tasks].sort(
    (a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed') ||
      (a.targetDate || '9999').localeCompare(b.targetDate || '9999')
  );
  const nearestTasks = orderedTasks.filter((task) => task.status !== 'completed').slice(0, 4);
  const visibleTasks = showAllTasks ? orderedTasks : nearestTasks;
  const blocks = blocksQuery.data?.blocks || [];
  const messages = feedbackQuery.data?.messages || [];
  const pushSubs = pushStatusQuery.data?.subscriptions || [];

  const activeDayLabels = remState
    ? WEEKDAYS.filter((d) => remState.daysOfWeek.includes(d.num))
        .map((d) => d.label)
        .join(', ')
    : '';

  return (
    <div className="stack-lg">
      <header className="pageHeader">
        {moodsQuery.data?.todayLocalDate && (
          <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
            {formatIndonesianDate(moodsQuery.data.todayLocalDate, school?.timezone)}
          </span>
        )}
        <h1 className="pageTitle">
          Halo, <span style={{ color: 'var(--color-primary)' }}>{user?.accountCode}</span>.
        </h1>
        <p className="pageLead">Satu langkah untuk hari ini, sesuai ritmemu.</p>
      </header>

      {dueReminderQuery.data?.due && dueReminderQuery.data?.reminder && (
        <StatusNotice tone="info">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Bell size={17} aria-hidden="true" />
            <strong>Pengingat:</strong> {dueReminderQuery.data.reminder.message}
          </span>
        </StatusNotice>
      )}

      {/* Ringkasan Utama: Cek Suasana Hati + Akses Cepat Aktivitas Utama */}
      <div className={styles.topGrid}>
        <Card className={`stack-md ${styles.dailyMood}`}>
          <div className="cluster" style={{ justifyContent: 'space-between' }}>
            <h2 className="cardTitle">Bagaimana perasaanmu hari ini?</h2>
            <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
              Opsional · BK melihat ringkasan
            </span>
          </div>

          <div
            className={styles.moodGrid}
            role="radiogroup"
            aria-label="Pilihan suasana hati hari ini"
          >
            {MOODS.map((m) => (
              <button
                key={m.code}
                type="button"
                role="radio"
                aria-checked={selectedMood === m.code}
                tabIndex={selectedMood === m.code ? 0 : -1}
                onKeyDown={(event) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                      event.key
                    )
                  )
                    return;
                  event.preventDefault();
                  const index = MOODS.findIndex((mood) => mood.code === m.code);
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? MOODS.length - 1
                        : (index +
                            (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) +
                            MOODS.length) %
                          MOODS.length;
                  setSelectedMood(MOODS[next].code);
                  const choices =
                    event.currentTarget.parentElement.querySelectorAll('[role="radio"]');
                  choices[next]?.focus();
                }}
                onClick={() => setSelectedMood(m.code)}
                className={`${styles.moodChip} ${
                  selectedMood === m.code ? styles.moodChipSelected : ''
                }`}
              >
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.pressureSection}>
            <div className={styles.pressureTop}>
              <label
                htmlFor="pressureSlider"
                style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}
              >
                Beban belajarmu hari ini (opsional)
              </label>
              <output htmlFor="pressureSlider" className="muted-text">
                {pressureLevel} / 10
              </output>
            </div>
            <input
              id="pressureSlider"
              type="range"
              min={0}
              max={10}
              value={pressureLevel}
              onChange={(e) => setPressureLevel(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          <StatusNotice tone={moodNotice?.tone}>{moodNotice?.text}</StatusNotice>
          {!moodNotice && moodsQuery.data?.todayEntry && !moodsQuery.data.todayEntry.skipped && (
            <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              Sudah dicatat hari ini.
            </p>
          )}

          <div className="cluster" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              size="sm"
              disabled={saveMoodMutation.isPending}
              onClick={() => saveMoodMutation.mutate({ skipped: true })}
            >
              Lewati
            </Button>
            <Button
              variant="primary"
              disabled={saveMoodMutation.isPending}
              onClick={() =>
                saveMoodMutation.mutate({
                  moodCode: selectedMood,
                  pressureLevel,
                  skipped: false,
                })
              }
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              <span>{saveMoodMutation.isPending ? 'Menyimpan...' : 'Simpan Suasana Hati'}</span>
            </Button>
          </div>
        </Card>

        <Card
          className={`stack-sm ${styles.dailyShortcuts}`}
          aria-label="Akses cepat aktivitas utama"
        >
          <h2 className="cardTitle">Aktivitas Utama</h2>
          <nav className={styles.quickList} aria-label="Pintasan aktivitas siswa">
            {QUICK_ACTIVITIES.map((act) => {
              const Icon = act.icon;
              return (
                <Link key={act.to} to={act.to} className={styles.quickRow}>
                  <span className={styles.quickIcon}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.quickText}>
                    <span className={styles.quickTitle}>{act.title}</span>
                    <span className={styles.quickDesc}>{act.desc}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </Card>
      </div>

      {/* Tugas Terdekat & Blok Istirahat */}
      <Card className={`stack-md ${styles.dailyTasks}`}>
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2 className="cardTitle">Tugas Terdekat</h2>
            <p className="muted-text" style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)' }}>
              {tasks.filter((task) => task.status !== 'completed').length} tugas belum selesai
            </p>
          </div>
          <Button onClick={() => setTaskEditorOpen(true)} size="sm">
            <Plus size={16} aria-hidden="true" />
            Tambah Tugas
          </Button>
        </div>

        <StatusNotice tone={plannerNotice?.tone}>{plannerNotice?.text}</StatusNotice>

        <Dialog open={taskEditorOpen} onClose={() => setTaskEditorOpen(false)} title="Tambah Tugas">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskTitle.trim()) return;
              createTaskMutation.mutate({
                title: taskTitle.trim(),
                targetDate: taskDate || null,
                estimatedMinutes: taskMinutes ? Number(taskMinutes) : null,
                isImportant: taskImportant,
                isUrgent: taskUrgent,
              });
            }}
            className="stack-sm"
          >
            <div className={styles.taskQuickAdd}>
              <Input
                label="Tambah tugas (maks. 120 karakter)"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                maxLength={120}
                required
                placeholder="Ringkas Fisika Bab 4"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={taskOptionsOpen}
                onClick={() => setTaskOptionsOpen((v) => !v)}
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
                <span>{taskOptionsOpen ? 'Tutup Opsi' : 'Opsi'}</span>
              </Button>
            </div>

            {taskOptionsOpen && (
              <div className={styles.taskOptionsRow}>
                <Input
                  label="Target tanggal (opsional)"
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                />
                <Input
                  label="Estimasi menit (opsional)"
                  type="number"
                  min={5}
                  max={300}
                  value={taskMinutes}
                  onChange={(e) => setTaskMinutes(e.target.value)}
                  placeholder="25"
                />
                <div className="cluster">
                  <label className={styles.checkPill}>
                    <input
                      type="checkbox"
                      checked={taskImportant}
                      onChange={(e) => setTaskImportant(e.target.checked)}
                    />
                    <span>Penting</span>
                  </label>
                  <label className={styles.checkPill}>
                    <input
                      type="checkbox"
                      checked={taskUrgent}
                      onChange={(e) => setTaskUrgent(e.target.checked)}
                    />
                    <span>Mendesak</span>
                  </label>
                </div>
              </div>
            )}
            <div className="cluster" style={{ justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={createTaskMutation.isPending}>
                <Plus size={16} aria-hidden="true" />
                <span>Tambah Tugas</span>
              </Button>
            </div>
          </form>
          <StatusNotice tone="error">{createTaskMutation.error?.message}</StatusNotice>
        </Dialog>

        {tasksQuery.isLoading ? (
          <LoadingState message="Memuat daftar tugas..." />
        ) : tasksQuery.isError ? (
          <ErrorState message={tasksQuery.error.message} onRetry={() => tasksQuery.refetch()} />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="Belum ada tugas tersimpan"
            description="Mulai dari satu tugas kecil agar beban belajar terasa lebih terukur."
          />
        ) : !visibleTasks.length ? (
          <p className="muted-text">Semua tugas selesai. Kamu bisa mengambil jeda.</p>
        ) : (
          <div className={styles.taskList}>
            {visibleTasks.map((task) => {
              const isOverdue =
                task.status === 'pending' &&
                task.targetDate &&
                todayLocal &&
                task.targetDate < todayLocal;
              const isExpanded = expandedTaskId === task.id;
              const metaParts = [];
              if (task.targetDate) {
                metaParts.push(formatIndonesianDate(task.targetDate, school?.timezone));
              }
              if (task.estimatedMinutes) {
                metaParts.push(`${task.estimatedMinutes} menit`);
              }

              return (
                <div key={task.id} className={styles.taskRow}>
                  <div className={styles.taskTop}>
                    <div className={styles.taskLead}>
                      <label className={styles.taskCheckboxTarget}>
                        <input
                          type="checkbox"
                          className={styles.taskCheck}
                          disabled={patchTaskMutation.isPending}
                          aria-label={`Tandai ${task.title}`}
                          checked={task.status === 'completed'}
                          onChange={(e) =>
                            patchTaskMutation.mutate({
                              id: task.id,
                              payload: { status: e.target.checked ? 'completed' : 'pending' },
                            })
                          }
                        />
                      </label>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                            opacity: task.status === 'completed' ? 0.6 : 1,
                          }}
                        >
                          {task.title}
                        </div>
                        {(metaParts.length > 0 || task.isImportant || task.isUrgent) && (
                          <div className={styles.taskMeta}>
                            {metaParts.length > 0 && <span>{metaParts.join(' · ')}</span>}
                            {task.isImportant && <Badge tone="lavender">Penting</Badge>}
                            {task.isUrgent && <Badge tone="warning">Mendesak</Badge>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="cluster" style={{ gap: 6 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={isExpanded}
                        aria-controls={`task-details-${task.id}`}
                        onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      >
                        <span>Langkah ({task.steps?.length || 0})</span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </Button>
                    </div>
                  </div>

                  {isOverdue && isExpanded && (
                    <div className={styles.overdueBar}>
                      <span>Tanggal target sudah lewat. Ingin menjadwal ulang?</span>
                      <div className="cluster">
                        <input
                          type="date"
                          aria-label={`Tanggal baru untuk ${task.title}`}
                          value={rescheduleDates[task.id] || todayLocal}
                          onChange={(e) =>
                            setRescheduleDates((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          className={styles.inlineControl}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            patchTaskMutation.mutate({
                              id: task.id,
                              payload: {
                                targetDate: rescheduleDates[task.id] || todayLocal,
                              },
                            })
                          }
                        >
                          Jadwal Ulang
                        </Button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className={styles.stepList} id={`task-details-${task.id}`}>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTaskTarget(task)}>
                        Hapus Tugas
                      </Button>
                      {(task.steps || []).map((st) => (
                        <div key={st.id} className={styles.stepRow}>
                          <label className="cluster" style={{ gap: 8, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={st.isDone}
                              onChange={(e) =>
                                toggleStepMutation.mutate({
                                  taskId: task.id,
                                  stepId: st.id,
                                  isDone: e.target.checked,
                                })
                              }
                            />
                            <span
                              style={{
                                textDecoration: st.isDone ? 'line-through' : 'none',
                                opacity: st.isDone ? 0.65 : 1,
                              }}
                            >
                              {st.title}
                            </span>
                          </label>
                        </div>
                      ))}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = (stepDrafts[task.id] || '').trim();
                          if (!val) return;
                          addStepMutation.mutate({ taskId: task.id, title: val });
                        }}
                        className={styles.stepForm}
                      >
                        <input
                          type="text"
                          value={stepDrafts[task.id] || ''}
                          onChange={(e) =>
                            setStepDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          aria-label={`Langkah baru untuk ${task.title}`}
                          placeholder="Tambah langkah kecil..."
                          className={styles.inlineControl}
                          maxLength={160}
                          required
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          disabled={addStepMutation.isPending}
                        >
                          Tambah Langkah
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tasks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showAllTasks}
            onClick={() => setShowAllTasks((value) => !value)}
          >
            {showAllTasks ? 'Tampilkan Tugas Terdekat' : `Lihat Semua Tugas (${tasks.length})`}
          </Button>
        )}
      </Card>

      {/* Panel Tambahan Ringkas: Pengingat, Pesan Sekolah, Skrining */}
      <section className={styles.utilities} aria-label="Jadwal dan informasi tambahan">
        <Disclosure
          className={styles.utilityPanel}
          title="Jadwal Istirahat & Tidur"
          subtitle="Atur waktu jeda dan tidur"
        >
          <StatusNotice tone={blockNotice?.tone}>{blockNotice?.text}</StatusNotice>
          {blocksQuery.isError && (
            <ErrorState message={blocksQuery.error.message} onRetry={() => blocksQuery.refetch()} />
          )}
          {/* Blok Istirahat & Tidur Ringkas */}
          <div className="stack-sm">
            <div className="cluster" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {blocks.length} jadwal tersimpan
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  createBlockMutation.reset();
                  setRestEditorOpen(true);
                }}
              >
                <Plus size={15} aria-hidden="true" />
                <span>Tambah Blok Istirahat</span>
              </Button>
            </div>

            {blocks.length > 0 && (
              <div className="cluster" style={{ gap: 8 }}>
                {blocks.map((b) => (
                  <div key={b.id} className={styles.blockChip}>
                    <span>
                      {b.blockType === 'sleep' ? 'Tidur' : 'Istirahat'}: {b.title} ({b.startTime}–
                      {b.endTime})
                    </span>
                    <button
                      type="button"
                      aria-label={`Hapus blok ${b.title}`}
                      disabled={deleteBlockMutation.isPending}
                      onClick={() => deleteBlockMutation.mutate(b.id)}
                      className={styles.blockDeleteBtn}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Disclosure>
        <Disclosure
          className={styles.utilityPanel}
          title="Pengaturan Pengingat"
          subtitle="Jadwal, jam tenang, dan notifikasi browser"
        >
          <StatusNotice tone={remNotice?.tone}>{remNotice?.text}</StatusNotice>
          <StatusNotice tone={pushNotice?.tone}>{pushNotice?.text}</StatusNotice>
          {remindersQuery.isError && (
            <ErrorState
              message={remindersQuery.error.message}
              onRetry={() => remindersQuery.refetch()}
            />
          )}
          {pushStatusQuery.isError && (
            <ErrorState
              message={pushStatusQuery.error.message}
              onRetry={() => pushStatusQuery.refetch()}
            />
          )}

          {remState && (
            <div className={styles.utilityRow}>
              <div className={styles.utilityLead}>
                <span className={styles.utilityTitle}>Pengingat Dalam Aplikasi</span>
                <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                  {activeDayLabels} · Jam {remState.preferredTime} · Tenang{' '}
                  {remState.quietHoursStart}–{remState.quietHoursEnd}
                </span>
              </div>
              <div className="cluster">
                <Switch
                  checked={remState.enabled}
                  disabled={saveReminderMutation.isPending}
                  label={remState.enabled ? 'Aktif' : 'Nonaktif'}
                  onChange={(nextVal) =>
                    saveReminderMutation.mutate({
                      enabled: nextVal,
                      reminderType: remState.reminderType,
                      daysOfWeek: remState.daysOfWeek,
                      preferredTime: remState.preferredTime,
                      quietHoursStart: remState.quietHoursStart,
                      quietHoursEnd: remState.quietHoursEnd,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    saveReminderMutation.reset();
                    setRemDraft({ ...remState, daysOfWeek: [...remState.daysOfWeek] });
                    setRemScheduleOpen(true);
                  }}
                >
                  Atur Jadwal
                </Button>
              </div>
            </div>
          )}

          <div className={styles.utilityRow}>
            <div className={styles.utilityLead}>
              <span className={styles.utilityTitle}>Notifikasi Browser (Sukarela)</span>
              <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                {pushSubs.length} perangkat aktif · Pesan selalu netral dan menghormati jam tenang.
              </span>
              {pushSubs.length > 0 && (
                <div className="cluster" style={{ marginTop: 6, gap: 8 }}>
                  {pushSubs.map((sub) => (
                    <span key={sub.id} className={styles.blockChip}>
                      <span>{sub.endpointHost}</span>
                      <button
                        type="button"
                        disabled={pushBusy}
                        aria-label={`Cabut ${sub.endpointHost}`}
                        onClick={() => handleRevokePush(sub.id)}
                        className={styles.blockDeleteBtn}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="cluster">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pushBusy}
                onClick={handleEnablePush}
              >
                Aktifkan Push Perangkat Ini
              </Button>
              {pushSubs.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pushBusy}
                  onClick={() => handleTestPush(false)}
                >
                  Uji Notifikasi
                </Button>
              )}
            </div>
          </div>
        </Disclosure>
        <Disclosure
          className={styles.utilityPanel}
          title="Pesan & Aktivitas Tambahan"
          subtitle={`${messages.length} pesan sekolah · Skrining mandiri opsional`}
        >
          {feedbackQuery.isError && (
            <ErrorState
              message={feedbackQuery.error.message}
              onRetry={() => feedbackQuery.refetch()}
            />
          )}
          <div className={styles.utilityRow}>
            <div className={styles.utilityLead}>
              <span className={styles.utilityTitle}>
                Pesan Kelompok dari Sekolah ({messages.length})
              </span>
              <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                {messages.length > 0
                  ? messages[0].title
                  : 'Belum ada pesan kelompok untuk kelompokmu.'}
              </span>
            </div>
            {messages.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setMessagesOpen(true)}>
                Lihat Pesan
              </Button>
            )}
          </div>

          <div className={styles.utilityRow}>
            <div className={styles.utilityLead}>
              <span className={styles.utilityTitle}>Skrining Mandiri Opsional</span>
              <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                Kenali kondisi dirimu secara sukarela. Bukan diagnosis.
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setScreeningOpen(true)}>
              Buka Bagian
            </Button>
          </div>
        </Disclosure>
        <Disclosure
          className={styles.utilityPanel}
          title="Privasi & Akses Data"
          subtitle="Kelola persetujuan dan data pribadimu"
        >
          <p className="muted-text" style={{ margin: 0 }}>
            Suasana hati, catatan, dan refleksi dapat diakses olehmu dan Superadmin. Guru BK melihat
            ringkasan dan aktivitas sesuai hak akses. Pengaturan data tersedia melalui menu Akun.
          </p>
          <Link to="/app/persetujuan" className="btnLink" style={{ marginTop: 12 }}>
            Privasi &amp; Persetujuan
          </Link>
        </Disclosure>
      </section>

      {/* Dialog: Tambah Blok Istirahat */}
      <Dialog
        open={restEditorOpen}
        onClose={() => setRestEditorOpen(false)}
        title="Tambah Blok Istirahat & Tidur"
        size="md"
      >
        <StatusNotice tone="error">{createBlockMutation.error?.message}</StatusNotice>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!blockTitle.trim()) return;
            createBlockMutation.mutate({
              blockType,
              title: blockTitle.trim(),
              startTime: blockStart,
              endTime: blockEnd,
            });
          }}
          className="stack-md"
        >
          <Select
            label="Jenis blok"
            value={blockType}
            onChange={(e) => setBlockType(e.target.value)}
          >
            <option value="rest">Istirahat</option>
            <option value="sleep">Tidur</option>
          </Select>
          <Input
            label="Nama jeda / istirahat"
            value={blockTitle}
            maxLength={120}
            onChange={(e) => setBlockTitle(e.target.value)}
            placeholder="Jeda 15 menit tanpa layar"
            required
          />
          <div className={styles.timeGrid}>
            <Input
              label="Jam mulai"
              type="time"
              value={blockStart}
              required
              onChange={(e) => setBlockStart(e.target.value)}
            />
            <Input
              label="Jam selesai"
              type="time"
              value={blockEnd}
              required
              onChange={(e) => setBlockEnd(e.target.value)}
            />
          </div>
          <div className="cluster" style={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={() => setRestEditorOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createBlockMutation.isPending}>
              Simpan Blok
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog: Jadwal & Jam Tenang Pengingat */}
      <Dialog
        open={remScheduleOpen}
        onClose={() => setRemScheduleOpen(false)}
        title="Atur Jadwal Pengingat & Jam Tenang"
        size="md"
      >
        <StatusNotice tone="error">{saveReminderMutation.error?.message}</StatusNotice>
        {remDraft && (
          <div className="stack-md">
            <div className="stack-sm">
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Hari aktif</span>
              <div className={styles.dayChips}>
                {WEEKDAYS.map((d) => {
                  const active = remDraft.daysOfWeek.includes(d.num);
                  return (
                    <button
                      key={d.num}
                      type="button"
                      aria-pressed={active}
                      className={`${styles.dayBtn} ${active ? styles.dayBtnActive : ''}`}
                      onClick={() => {
                        const nextDays = active
                          ? remDraft.daysOfWeek.filter((x) => x !== d.num)
                          : [...remDraft.daysOfWeek, d.num].sort();
                        if (nextDays.length === 0) return;
                        setRemDraft({ ...remDraft, daysOfWeek: nextDays });
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.timeGrid}>
              <Input
                label="Jam Pengingat"
                type="time"
                value={remDraft.preferredTime}
                onChange={(e) => setRemDraft({ ...remDraft, preferredTime: e.target.value })}
              />
              <Input
                label="Jam Tenang Mulai"
                type="time"
                value={remDraft.quietHoursStart}
                onChange={(e) => setRemDraft({ ...remDraft, quietHoursStart: e.target.value })}
              />
              <Input
                label="Jam Tenang Selesai"
                type="time"
                value={remDraft.quietHoursEnd}
                onChange={(e) => setRemDraft({ ...remDraft, quietHoursEnd: e.target.value })}
              />
            </div>
            <div className="cluster" style={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setRemScheduleOpen(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                disabled={saveReminderMutation.isPending}
                onClick={() =>
                  saveReminderMutation.mutate({
                    enabled: remDraft.enabled,
                    reminderType: remDraft.reminderType,
                    daysOfWeek: remDraft.daysOfWeek,
                    preferredTime: remDraft.preferredTime,
                    quietHoursStart: remDraft.quietHoursStart,
                    quietHoursEnd: remDraft.quietHoursEnd,
                  })
                }
              >
                Simpan Jadwal Pengingat
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog: Pesan Kelompok dari Sekolah */}
      <Dialog
        open={messagesOpen}
        onClose={() => setMessagesOpen(false)}
        title="Pesan Kelompok dari Pengelola"
        size="md"
        actions={
          <Button variant="secondary" onClick={() => setMessagesOpen(false)}>
            Tutup
          </Button>
        }
      >
        <div className="flatList">
          {messages.map((msg) => (
            <div key={msg.id} className="flatRow stack-sm">
              <div className="cluster" style={{ justifyContent: 'space-between' }}>
                <strong>{msg.title}</strong>
                <Badge tone="neutral">{msg.targetGroup}</Badge>
              </div>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{msg.body}</p>
              <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                {msg.periodLabel}
              </span>
            </div>
          ))}
        </div>
      </Dialog>

      {/* Dialog: Skrining Mandiri Opsional */}
      <Dialog
        open={screeningOpen}
        onClose={() => setScreeningOpen(false)}
        title="Skrining Mandiri Opsional"
        size="lg"
        actions={
          <Button variant="ghost" onClick={() => setScreeningOpen(false)}>
            Tutup
          </Button>
        }
      >
        {screeningQuery.isLoading ? (
          <LoadingState message="Memeriksa ketersediaan instrumen..." />
        ) : screeningQuery.isError ? (
          <ErrorState
            message={screeningQuery.error.message}
            onRetry={() => screeningQuery.refetch()}
          />
        ) : !screeningQuery.data?.available || screeningQuery.data?.isSimulation ? (
          <StatusNotice tone="info">
            {screeningQuery.data?.isSimulation
              ? 'Skrining belum tersedia.'
              : screeningQuery.data?.notice || 'Instrumen belum tersedia.'}
          </StatusNotice>
        ) : (
          <div className="stack-md">
            <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              {screeningQuery.data.instrument.description}
            </p>
            <StatusNotice tone={screeningNotice?.tone}>{screeningNotice?.text}</StatusNotice>

            {screeningQuery.data.instrument.items.map((item) => (
              <div key={item.id} className="stack-sm">
                <strong style={{ fontSize: 'var(--text-sm)' }}>{item.prompt}</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {item.options.map((opt) => (
                    <label
                      key={opt.value}
                      className={`${styles.screeningOption} ${
                        screeningAnswers[item.id] === opt.value
                          ? styles.screeningOptionSelected
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={item.id}
                        checked={screeningAnswers[item.id] === opt.value}
                        onChange={() =>
                          setScreeningAnswers((prev) => ({ ...prev, [item.id]: opt.value }))
                        }
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <Button
                variant="primary"
                disabled={submitScreeningMutation.isPending}
                onClick={() =>
                  submitScreeningMutation.mutate({
                    instrumentId: screeningQuery.data.instrument.id,
                    answers: screeningAnswers,
                  })
                }
              >
                {submitScreeningMutation.isPending ? 'Memproses...' : 'Lihat Ringkasan'}
              </Button>
            </div>

            {screeningResult && (
              <div className={styles.screeningResultBox}>
                <strong>{screeningResult.interpretationLabel}</strong>
                <p style={{ margin: '6px 0 10px' }}>{screeningResult.supportMessage}</p>
                <Link
                  to="/app/bantuan"
                  style={{ fontWeight: 700, color: 'var(--color-primary-hover)' }}
                >
                  Butuh bicara? →
                </Link>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Dialog: Konfirmasi Hapus Tugas */}
      <Dialog
        open={Boolean(deleteTaskTarget)}
        onClose={() => setDeleteTaskTarget(null)}
        title="Hapus Tugas Ini?"
        description={
          deleteTaskTarget
            ? `Tugas "${deleteTaskTarget.title}" beserta seluruh langkah kecil di dalamnya akan dihapus dari rencanamu.`
            : null
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTaskTarget(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={deleteTaskMutation.isPending}
              onClick={() => deleteTaskTarget && deleteTaskMutation.mutate(deleteTaskTarget.id)}
            >
              {deleteTaskMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Tugas'}
            </Button>
          </>
        }
      />
    </div>
  );
}
