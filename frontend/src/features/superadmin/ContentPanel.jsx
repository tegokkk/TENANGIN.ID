import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { ActionMenu } from '../../components/ui/ActionMenu.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import styles from './SuperadminPanels.module.css';

const STATUS_LABELS = {
  draft: 'Draf',
  in_review: 'Tinjauan',
  approved: 'Disetujui',
  published: 'Terbit',
  archived: 'Arsip',
};

const TRANSITIONS = {
  draft: [['in_review', 'Ajukan Tinjauan']],
  in_review: [
    ['approved', 'Setujui'],
    ['draft', 'Kembalikan ke Draf'],
  ],
  approved: [
    ['published', 'Terbitkan'],
    ['in_review', 'Tinjau Ulang'],
  ],
  published: [['archived', 'Arsipkan']],
  archived: [['draft', 'Buka Draf']],
};

function slugifyTitle(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function ContentForm({ kind, record, onSaved, onCancel }) {
  const isArticle = kind === 'articles';
  const formRef = useRef(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(record?.slug));
  const [form, setForm] = useState(() => ({
    slug: record?.slug || '',
    title: record?.title || '',
    topic: record?.topic || '',
    summary: record?.summary || '',
    body: record?.body || '',
    tags: (record?.tags || []).join(', '),
    category: record?.category || 'breathing',
    subtitle: record?.subtitle || '',
    durationSeconds: record?.duration_seconds || 180,
    stopNotice: record?.stop_notice || '',
    audioUrl: record?.audio_url || '',
    sourceReference: record?.source_reference || (isArticle ? 'Tim BK / Sekolah' : ''),
    mediaRights: record?.media_rights || (isArticle ? 'Materi internal sekolah' : ''),
    instructions: record?.instructions || [{ phase: '', seconds: 4, quote: '', detail: '' }],
  }));
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const save = useMutation({
    mutationFn: ({ publishNow = false } = {}) =>
      apiRequest(`/superadmin/content/${kind}${record ? `/${record.id}` : ''}`, {
        method: record ? 'PATCH' : 'POST',
        body: {
          ...form,
          tags: form.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          durationSeconds: Number(form.durationSeconds),
          audioUrl: form.audioUrl || null,
          version: record?.version,
          ...(isArticle ? { publishNow } : {}),
        },
      }),
    onSuccess: (_data, variables) => onSaved({ published: Boolean(variables?.publishNow) }),
  });

  function handleTitleChange(value) {
    setForm((previous) => ({
      ...previous,
      title: value,
      ...(isArticle && !record && !slugTouched ? { slug: slugifyTitle(value) } : {}),
    }));
  }

  function handlePublishNow() {
    if (formRef.current && !formRef.current.reportValidity()) return;
    save.mutate({ publishNow: true });
  }

  return (
    <form
      ref={formRef}
      className={styles.editorBox}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ publishNow: false });
      }}
    >
      <h3 className="cardTitle">
        {record ? 'Edit' : 'Buat Draf'} {isArticle ? 'Artikel' : 'Latihan'}
        {record ? ` — v${record.version}` : ' Baru'}
      </h3>
      <StatusNotice tone="info">
        {isArticle
          ? 'Pilih "Simpan & Terbitkan ke Siswa" agar materi langsung tampil di menu Materi siswa, atau "Simpan Draf" untuk meninjau terlebih dahulu.'
          : 'Perubahan isi membuat versi baru berstatus draf dan memerlukan tinjauan ulang.'}
      </StatusNotice>
      <div className={styles.twoColGrid}>
        <Input
          label="Slug"
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set('slug', e.target.value);
          }}
          placeholder="otomatis-dari-judul"
          required
          maxLength={120}
        />
        <Input
          label={isArticle ? 'Judul Artikel' : 'Judul Latihan'}
          value={form.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={isArticle ? 'Contoh: Cara Mengatur Waktu Belajar Jelang Ujian' : ''}
          required
          maxLength={200}
        />
      </div>

      {isArticle ? (
        <>
          <div className={styles.twoColGrid}>
            <Input
              label="Topik"
              value={form.topic}
              onChange={(e) => set('topic', e.target.value)}
              placeholder="Contoh: Stres Belajar, Emosi, Tidur"
              required
            />
            <Input
              label="Tag (pisahkan dengan koma)"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="stres, fokus, ujian"
            />
          </div>
          <Input
            label="Ringkasan"
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            placeholder="Ringkasan singkat isi materi untuk pratinjau siswa"
            required
            maxLength={400}
          />
          <Textarea
            label="Isi Artikel"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
            placeholder="Tulis isi materi lengkap di sini..."
            required
            maxLength={20000}
          />
        </>
      ) : (
        <>
          <div className={styles.twoColGrid}>
            <Select
              label="Kategori Latihan"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="breathing">Napas</option>
              <option value="muscle_relaxation">Relaksasi Otot</option>
              <option value="mindfulness">Mindfulness</option>
            </Select>
            <Input
              label="Durasi Latihan (detik)"
              type="number"
              min={30}
              max={1800}
              value={form.durationSeconds}
              onChange={(e) => set('durationSeconds', e.target.value)}
              required
            />
          </div>
          <Input
            label="Deskripsi Singkat"
            value={form.subtitle}
            onChange={(e) => set('subtitle', e.target.value)}
            required
          />
          <Textarea
            label="Petunjuk Berhenti"
            value={form.stopNotice}
            onChange={(e) => set('stopNotice', e.target.value)}
            required
          />
          <Input
            label="URL Audio (opsional)"
            value={form.audioUrl}
            onChange={(e) => set('audioUrl', e.target.value)}
          />
          {form.instructions.map((step, index) => (
            <fieldset className={`stack-sm ${styles.fieldsetBox}`} key={index}>
              <legend>Langkah {index + 1}</legend>
              <div className={styles.twoColGrid}>
                {[
                  ['phase', 'Nama Fase'],
                  ['seconds', 'Durasi Fase (detik)'],
                  ['quote', 'Instruksi'],
                  ['detail', 'Detail Opsional'],
                ].map(([key, label]) => (
                  <Input
                    key={key}
                    label={`${label} ${index + 1}`}
                    type={key === 'seconds' ? 'number' : 'text'}
                    min={key === 'seconds' ? 1 : undefined}
                    max={key === 'seconds' ? 120 : undefined}
                    required={key !== 'detail'}
                    value={step[key]}
                    onChange={(e) =>
                      set(
                        'instructions',
                        form.instructions.map((s, i) =>
                          i === index
                            ? {
                                ...s,
                                [key]: key === 'seconds' ? Number(e.target.value) : e.target.value,
                              }
                            : s
                        )
                      )
                    }
                  />
                ))}
              </div>
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={form.instructions.length === 1}
                  onClick={() =>
                    set(
                      'instructions',
                      form.instructions.filter((_, i) => i !== index)
                    )
                  }
                >
                  Hapus Langkah {index + 1}
                </Button>
              </div>
            </fieldset>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={form.instructions.length >= 20}
              onClick={() =>
                set('instructions', [
                  ...form.instructions,
                  { phase: '', seconds: 4, quote: '', detail: '' },
                ])
              }
            >
              Tambah Langkah
            </Button>
          </div>
        </>
      )}

      <div className={styles.twoColGrid}>
        <Input
          label="Sumber Materi"
          value={form.sourceReference}
          onChange={(e) => set('sourceReference', e.target.value)}
          required
        />
        <Input
          label="Hak Penggunaan Media"
          value={form.mediaRights}
          onChange={(e) => set('mediaRights', e.target.value)}
          required
        />
      </div>

      <StatusNotice tone="error">{save.error?.message}</StatusNotice>
      <div className="cluster">
        {isArticle && (
          <Button
            type="button"
            variant="primary"
            disabled={save.isPending}
            onClick={handlePublishNow}
          >
            {save.isPending ? 'Menyimpan...' : 'Simpan & Terbitkan ke Siswa'}
          </Button>
        )}
        <Button type="submit" variant={isArticle ? 'secondary' : 'primary'} disabled={save.isPending}>
          {save.isPending ? 'Menyimpan...' : 'Simpan Draf'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Tutup Editor
        </Button>
      </div>
    </form>
  );
}

function ContentSection({ kind, title, subtitle }) {
  const isArticle = kind === 'articles';
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [reviewers, setReviewers] = useState({});
  const [notice, setNotice] = useState(null);
  const query = useQuery({
    queryKey: ['superadmin', kind],
    queryFn: () => apiRequest(`/superadmin/content/${kind}`),
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['superadmin', kind] });
    queryClient.invalidateQueries({ queryKey: [kind] });
  };
  const status = useMutation({
    mutationFn: ({ row, next }) =>
      apiRequest(`/superadmin/content/${kind}/${row.id}/status`, {
        method: 'PATCH',
        body: {
          status: next,
          version: row.version,
          reviewerRef: reviewers[row.id] || row.reviewer_ref || null,
        },
      }),
    onSuccess: () => {
      refresh();
      setNotice('Status konten diperbarui dan dicatat pada audit.');
    },
  });
  const remove = useMutation({
    mutationFn: (row) =>
      apiRequest(`/superadmin/content/${kind}/${row.id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      refresh();
      setDeleteTarget(null);
      setNotice('Materi dihapus dan dicatat pada audit.');
    },
  });

  const rows = (query.data?.[kind] || []).filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(row.title || '')
        .toLowerCase()
        .includes(q) ||
      String(row.topic || '')
        .toLowerCase()
        .includes(q) ||
      String(row.summary || '')
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <Card className="stack-md">
      <div className={styles.rowBetween}>
        <div>
          <h2 className="cardTitle">{title}</h2>
          {subtitle && (
            <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={() => setEditor({})}>
          Buat {isArticle ? 'Artikel' : 'Latihan'} Baru
        </Button>
      </div>

      {isArticle && (
        <Input
          label="Cari materi"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari judul, topik, atau ringkasan materi..."
        />
      )}

      <StatusNotice tone="success">{notice}</StatusNotice>
      <StatusNotice tone="error">{status.error?.message || remove.error?.message}</StatusNotice>

      <Dialog
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={`${editor?.id ? 'Edit' : 'Buat Draf'} ${isArticle ? 'Artikel' : 'Latihan'}${editor?.version ? ` — v${editor.version}` : ' Baru'}`}
        size="lg"
      >
        {editor && (
          <ContentForm
            key={editor.id || 'new'}
            kind={kind}
            record={editor.id ? editor : null}
            onCancel={() => setEditor(null)}
            onSaved={({ published } = {}) => {
              refresh();
              setEditor(null);
              setNotice(
                published
                  ? 'Materi diterbitkan ke ruang siswa dan dicatat pada audit.'
                  : 'Draf tersimpan dan dicatat pada audit.'
              );
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus Materi"
        size="sm"
      >
        <div className="stack-md">
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Yakin ingin menghapus materi <strong>{deleteTarget?.title}</strong>? Materi yang
            dihapus tidak lagi muncul di ruang siswa.
          </p>
          <div className="cluster">
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget)}
            >
              {remove.isPending ? 'Menghapus...' : 'Ya, Hapus Materi'}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Batal
            </Button>
          </div>
        </div>
      </Dialog>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      ) : rows.length === 0 ? (
        <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
          {search.trim()
            ? `Tidak ada materi yang cocok dengan "${search.trim()}".`
            : `Belum ada ${isArticle ? 'materi' : 'latihan'}.`}
        </p>
      ) : (
        <div className="stack-sm">
          {rows.map((row) => (
            <section className={styles.itemCard} key={row.id} aria-label={row.title}>
              <div className={styles.twoColActionRow}>
                <div className="stack-xs" style={{ minWidth: 0 }}>
                  <div className="cluster">
                    <strong>{row.title}</strong>
                    <Badge tone={row.status === 'published' ? 'success' : 'warning'}>
                      v{row.version} • {STATUS_LABELS[row.status] || row.status}
                    </Badge>
                    {isArticle && row.topic && <Badge tone="neutral">{row.topic}</Badge>}
                  </div>
                  {isArticle && row.summary && (
                    <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                      {row.summary}
                    </p>
                  )}
                </div>
                <div className="cluster">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Edit ${isArticle ? 'Artikel' : 'Latihan'}: ${row.title}`}
                    onClick={() => setEditor(row)}
                  >
                    Edit {isArticle ? 'Artikel' : 'Latihan'}
                  </Button>
                  <ActionMenu
                    label="Status Konten"
                    items={[
                      ...(TRANSITIONS[row.status] || []).map(([next, label]) => ({
                        key: next,
                        label,
                        disabled: status.isPending,
                        onClick: () => status.mutate({ row, next }),
                      })),
                      ...(isArticle
                        ? [
                            {
                              key: 'delete',
                              label: 'Hapus Materi',
                              tone: 'danger',
                              disabled: remove.isPending,
                              onClick: () => setDeleteTarget(row),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
              {row.status === 'in_review' && (
                <Input
                  label={`Referensi Peninjau: ${row.title}`}
                  value={reviewers[row.id] ?? row.reviewer_ref ?? ''}
                  onChange={(e) => setReviewers((old) => ({ ...old, [row.id]: e.target.value }))}
                />
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}

export function ContentPanel() {
  return (
    <div className="stack-lg">
      <ContentSection
        kind="articles"
        title="Materi & Artikel Siswa"
        subtitle="Materi yang berstatus Terbit akan langsung muncul di menu Materi dan Ruang Tenang siswa."
      />
      <ContentSection
        kind="exercises"
        title="Alur Penerbitan Latihan Tenang"
        subtitle="Latihan yang berstatus Terbit akan muncul di halaman Ruang Tenang siswa."
      />
    </div>
  );
}
