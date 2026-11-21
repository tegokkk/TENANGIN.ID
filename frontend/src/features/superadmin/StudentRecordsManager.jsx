import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import styles from './SuperadminPanels.module.css';

const DOMAINS = {
  journals: {
    label: 'Jurnal',
    fields: [
      ['situation', 'Situasi', 'textarea'],
      ['thoughts', 'Pikiran', 'textarea'],
      ['feelings', 'Perasaan', 'textarea'],
      ['alternative', 'Alternatif', 'textarea'],
    ],
  },
  reflections: {
    label: 'Refleksi',
    fields: [
      ['weekStart', 'Minggu Refleksi', 'date'],
      ['helpful', 'Hal yang Membantu', 'textarea'],
      ['obstacle', 'Hambatan', 'textarea'],
      ['plan', 'Rencana', 'textarea'],
    ],
  },
  moods: {
    label: 'Mood',
    fields: [
      [
        'moodCode',
        'Suasana Hati',
        ['very_heavy', 'anxious_tired', 'neutral', 'calm_relieved', 'energized'],
      ],
      ['pressureLevel', 'Tekanan Subjektif (0–10, opsional)', 'number'],
      ['skipped', 'Dilewati', 'checkbox'],
    ],
  },
  tasks: {
    label: 'Tugas',
    fields: [
      ['title', 'Judul Tugas', 'text'],
      ['notes', 'Catatan Tugas', 'textarea'],
      ['targetDate', 'Tanggal Target', 'date'],
      ['estimatedMinutes', 'Estimasi Menit', 'number'],
      ['isImportant', 'Penting', 'checkbox'],
      ['isUrgent', 'Mendesak', 'checkbox'],
      ['status', 'Status Tugas', ['pending', 'completed']],
    ],
  },
  'schedule-blocks': {
    label: 'Jadwal Istirahat',
    fields: [
      ['blockType', 'Jenis Jadwal', ['rest', 'sleep']],
      ['title', 'Judul Jadwal', 'text'],
      ['startTime', 'Jam Mulai', 'time'],
      ['endTime', 'Jam Selesai', 'time'],
    ],
  },
  reminders: {
    label: 'Pengingat',
    fields: [
      ['enabled', 'Pengingat Aktif', 'checkbox'],
      ['reminderType', 'Jenis Pengingat', ['jeda_belajar', 'cek_mood', 'refleksi_mingguan']],
      ['preferredTime', 'Jam Pengingat', 'time'],
      ['timezone', 'Zona Waktu IANA', 'text'],
      ['quietHoursStart', 'Jam Tenang Mulai', 'time'],
      ['quietHoursEnd', 'Jam Tenang Selesai', 'time'],
    ],
  },
  sessions: { label: 'Riwayat Latihan', readonly: true },
  screening: { label: 'Respons Skrining', readonly: true },
};

const LABELS = {
  very_heavy: 'Sangat Berat',
  anxious_tired: 'Cemas / Lelah',
  neutral: 'Biasa Saja',
  calm_relieved: 'Tenang / Lega',
  energized: 'Bersemangat',
  pending: 'Belum Selesai',
  completed: 'Selesai',
  rest: 'Istirahat',
  sleep: 'Tidur',
  jeda_belajar: 'Jeda Belajar',
  cek_mood: 'Cek Mood',
  refleksi_mingguan: 'Refleksi Mingguan',
};

function RecordForm({ studentId, domain, record, onSaved, onCancel }) {
  const [form, setForm] = useState(() => ({
    moodCode: 'neutral',
    blockType: 'rest',
    status: 'pending',
    reminderType: 'jeda_belajar',
    timezone: 'Asia/Jakarta',
    daysOfWeek: [1, 2, 3, 4, 5],
    preferredTime: '16:00',
    quietHoursStart: '21:30',
    quietHoursEnd: '06:00',
    emotionTags: [],
    strategyTags: [],
    steps: [],
    ...record,
  }));
  const [reason, setReason] = useState('');
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, reason };
      for (const [key, , type] of DOMAINS[domain].fields) {
        if (type === 'number')
          payload[key] = form[key] === '' || form[key] == null ? null : Number(form[key]);
        if (type === 'checkbox') payload[key] = Boolean(form[key]);
        if (type === 'date' && !payload[key]) delete payload[key];
      }
      return apiRequest(
        `/superadmin/students/${studentId}/records/${domain}${record ? `/${record.id}` : ''}`,
        { method: record ? 'PATCH' : 'POST', body: payload }
      );
    },
    onSuccess: onSaved,
  });

  return (
    <form
      className={styles.editorBox}
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h3 className="cardTitle">
        {record ? 'Edit' : 'Tambah'} {DOMAINS[domain].label}
      </h3>
      {DOMAINS[domain].fields.map(([key, label, type]) =>
        Array.isArray(type) ? (
          <Select
            key={key}
            label={label}
            value={form[key] || type[0]}
            onChange={(e) => set(key, e.target.value)}
          >
            {type.map((value) => (
              <option key={value} value={value}>
                {LABELS[value] || value}
              </option>
            ))}
          </Select>
        ) : type === 'checkbox' ? (
          <label key={key} className={styles.checkRow}>
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => set(key, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        ) : type === 'textarea' ? (
          <Textarea
            key={key}
            label={label}
            maxLength={domain === 'tasks' ? 500 : 2000}
            value={form[key] || ''}
            onChange={(e) => set(key, e.target.value)}
          />
        ) : (
          <Input
            key={key}
            label={label}
            type={type}
            value={form[key] ?? ''}
            onChange={(e) => set(key, e.target.value)}
          />
        )
      )}

      {domain === 'tasks' && (
        <fieldset className={`stack-sm ${styles.fieldsetBox}`}>
          <legend>Langkah Kecil</legend>
          {form.steps.map((step, index) => (
            <div key={index} className={styles.itemCard}>
              <Input
                label={`Judul Langkah ${index + 1}`}
                value={step.title}
                onChange={(e) =>
                  set(
                    'steps',
                    form.steps.map((s, i) => (i === index ? { ...s, title: e.target.value } : s))
                  )
                }
                required
              />
              <div className={styles.rowBetween}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={step.isDone}
                    onChange={(e) =>
                      set(
                        'steps',
                        form.steps.map((s, i) =>
                          i === index ? { ...s, isDone: e.target.checked } : s
                        )
                      )
                    }
                  />
                  <span>Langkah {index + 1} selesai</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(
                      'steps',
                      form.steps.filter((_, i) => i !== index)
                    )
                  }
                >
                  Hapus Langkah {index + 1}
                </Button>
              </div>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => set('steps', [...form.steps, { title: '', isDone: false }])}
            >
              Tambah Langkah Kecil
            </Button>
          </div>
        </fieldset>
      )}

      {domain === 'reminders' && (
        <fieldset className={styles.fieldsetBox}>
          <legend>Hari Pengingat</legend>
          <div className="cluster">
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day, index) => (
              <label key={day} className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.daysOfWeek.includes(index + 1)}
                  onChange={(e) =>
                    set(
                      'daysOfWeek',
                      e.target.checked
                        ? [...form.daysOfWeek, index + 1]
                        : form.daysOfWeek.filter((n) => n !== index + 1)
                    )
                  }
                />
                <span>{day}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <Input
        label="Alasan Perubahan"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        minLength={3}
        maxLength={200}
        required
      />
      <StatusNotice tone="error">{save.error?.message}</StatusNotice>
      <div className="cluster">
        <Button type="submit" disabled={save.isPending}>
          Simpan Data Siswa
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Batal Mengedit
        </Button>
      </div>
    </form>
  );
}

export function StudentRecordsManager({ studentId }) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState('journals');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState(null);

  const query = useQuery({
    queryKey: ['superadmin', 'student-records', studentId, domain, page],
    queryFn: () => apiRequest(`/superadmin/students/${studentId}/records/${domain}?page=${page}`),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['superadmin'] });
  };

  const erase = useMutation({
    mutationFn: () =>
      apiRequest(`/superadmin/students/${studentId}/records/${domain}/${deleting.id}`, {
        method: 'DELETE',
        body: { reason },
      }),
    onSuccess: () => {
      setDeleting(null);
      setReason('');
      refresh();
      setNotice('Entri dihapus dan audit tercatat.');
    },
  });

  return (
    <section className="stack-md">
      <div className={styles.rowBetween} style={{ alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Select
            label="Jenis Data Siswa"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setPage(1);
              setEditor(null);
            }}
          >
            {Object.entries(DOMAINS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </Select>
        </div>

        {!DOMAINS[domain].readonly && (
          <Button variant="secondary" onClick={() => setEditor({})}>
            Tambah {DOMAINS[domain].label}
          </Button>
        )}
      </div>

      <StatusNotice tone="success">{notice}</StatusNotice>

      {DOMAINS[domain].readonly && (
        <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
          Rekaman aktivitas asli dapat dibaca dan dihapus. Jawaban serta durasi baru dicatat melalui
          aktivitas siswa.
        </p>
      )}

      <Dialog
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={`${editor?.id ? 'Edit' : 'Tambah'} ${DOMAINS[domain]?.label || 'Data Siswa'}`}
        size="lg"
      >
        {editor && (
          <RecordForm
            key={`${domain}-${editor.id || 'new'}`}
            domain={domain}
            studentId={studentId}
            record={editor.id ? editor : null}
            onCancel={() => setEditor(null)}
            onSaved={() => {
              refresh();
              setEditor(null);
              setNotice('Perubahan tersimpan dan audit tercatat.');
            }}
          />
        )}
      </Dialog>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : (
        <div className="stack-sm">
          {(query.data?.entries || []).map((row) => (
            <article key={row.id} className={styles.recordCard}>
              <strong>
                {row.localDate || row.weekStart || DOMAINS[domain].label}
                {row.version ? ` — v${row.version}` : ''}
              </strong>
              {(DOMAINS[domain].fields || []).map(([key, label]) => (
                <p key={key}>
                  <strong>{label}:</strong>{' '}
                  {typeof row[key] === 'boolean'
                    ? row[key]
                      ? 'Ya'
                      : 'Tidak'
                    : LABELS[row[key]] || row[key] || '—'}
                </p>
              ))}
              {domain === 'sessions' && (
                <p>
                  Status: {row.status}; durasi aktif: {row.activeSeconds} detik; versi latihan:{' '}
                  {row.exerciseVersion}.
                </p>
              )}
              {domain === 'screening' && (
                <>
                  <p>
                    {row.isSimulation ? 'Simulasi, bukan hasil penilaian.' : 'Instrumen disahkan'}{' '}
                    Versi: {row.instrumentVersion}. {row.interpretation}
                  </p>
                  <dl>
                    {Object.entries(row.answers || {}).map(([key, value]) => (
                      <div key={key}>
                        <dt>Butir {key}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              <div className="cluster" style={{ marginTop: 4 }}>
                {!DOMAINS[domain].readonly && (
                  <Button variant="secondary" size="sm" onClick={() => setEditor(row)}>
                    Edit Entri
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setDeleting(row);
                    setReason('');
                  }}
                >
                  Hapus Entri
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className={styles.paginationBar}>
        <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
          Halaman {page}
        </span>
        <div className="cluster">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((n) => n - 1)}
          >
            Sebelumnya
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={page * 20 >= (query.data?.pagination.total || 0)}
            onClick={() => setPage((n) => n + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Hapus Entri Siswa"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={erase.isPending || reason.trim().length < 3}
              onClick={() => erase.mutate()}
            >
              Konfirmasi Hapus
            </Button>
          </>
        }
      >
        <div className="stack-sm">
          <Input
            label="Alasan Penghapusan"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
          />
          <StatusNotice tone="error">{erase.error?.message}</StatusNotice>
        </div>
      </Dialog>
    </section>
  );
}
