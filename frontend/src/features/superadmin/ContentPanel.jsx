import { useState } from 'react';
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

function ContentForm({ kind, record, onSaved, onCancel }) {
  const isArticle = kind === 'articles';
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
    sourceReference: record?.source_reference || '',
    mediaRights: record?.media_rights || '',
    instructions: record?.instructions || [{ phase: '', seconds: 4, quote: '', detail: '' }],
  }));
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const save = useMutation({
    mutationFn: () =>
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
        },
      }),
    onSuccess: onSaved,
  });

  return (
    <form
      className={styles.editorBox}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <h3 className="cardTitle">
        {record ? 'Edit' : 'Buat Draf'} {isArticle ? 'Artikel' : 'Latihan'}
        {record ? ` — v${record.version}` : ' Baru'}
      </h3>
      <StatusNotice tone="info">
        Perubahan isi membuat versi baru berstatus draf dan memerlukan tinjauan ulang.
      </StatusNotice>
      <div className={styles.twoColGrid}>
        <Input
          label="Slug"
          value={form.slug}
          onChange={(e) => set('slug', e.target.value)}
          required
          maxLength={120}
        />
        <Input
          label={isArticle ? 'Judul Artikel' : 'Judul Latihan'}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
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
              required
            />
            <Input
              label="Tag (pisahkan dengan koma)"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
            />
          </div>
          <Input
            label="Ringkasan"
            value={form.summary}
            onChange={(e) => set('summary', e.target.value)}
            required
            maxLength={400}
          />
          <Textarea
            label="Isi Artikel"
            value={form.body}
            onChange={(e) => set('body', e.target.value)}
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
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Menyimpan...' : 'Simpan Draf'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Tutup Editor
        </Button>
      </div>
    </form>
  );
}

function ContentSection({ kind, title }) {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState(null);
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

  return (
    <Card className="stack-md">
      <div className={styles.rowBetween}>
        <h2 className="cardTitle">{title}</h2>
        <Button variant="primary" size="sm" onClick={() => setEditor({})}>
          Buat {kind === 'articles' ? 'Artikel' : 'Latihan'} Baru
        </Button>
      </div>

      <StatusNotice tone="success">{notice}</StatusNotice>
      <StatusNotice tone="error">{status.error?.message}</StatusNotice>

      <Dialog
        open={Boolean(editor)}
        onClose={() => setEditor(null)}
        title={`${editor?.id ? 'Edit' : 'Buat Draf'} ${kind === 'articles' ? 'Artikel' : 'Latihan'}${editor?.version ? ` — v${editor.version}` : ' Baru'}`}
        size="lg"
      >
        {editor && (
          <ContentForm
            key={editor.id || 'new'}
            kind={kind}
            record={editor.id ? editor : null}
            onCancel={() => setEditor(null)}
            onSaved={() => {
              refresh();
              setEditor(null);
              setNotice('Draf tersimpan dan dicatat pada audit.');
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
          {(query.data?.[kind] || []).map((row) => (
            <section className={styles.itemCard} key={row.id} aria-label={row.title}>
              <div className={styles.twoColActionRow}>
                <div className="cluster">
                  <strong>{row.title}</strong>
                  <Badge tone={row.status === 'published' ? 'success' : 'warning'}>
                    v{row.version} • {STATUS_LABELS[row.status] || row.status}
                  </Badge>
                </div>
                <div className="cluster">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Edit ${kind === 'articles' ? 'Artikel' : 'Latihan'}: ${row.title}`}
                    onClick={() => setEditor(row)}
                  >
                    Edit {kind === 'articles' ? 'Artikel' : 'Latihan'}
                  </Button>
                  <ActionMenu
                    label="Status Konten"
                    items={(TRANSITIONS[row.status] || []).map(([next, label]) => ({
                      key: next,
                      label,
                      disabled: status.isPending,
                      onClick: () => status.mutate({ row, next }),
                    }))}
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
      <ContentSection kind="articles" title="Alur Penerbitan Artikel" />
      <ContentSection kind="exercises" title="Alur Penerbitan Latihan Tenang" />
    </div>
  );
}
