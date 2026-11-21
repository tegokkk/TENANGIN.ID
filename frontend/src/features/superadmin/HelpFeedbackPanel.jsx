import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDateTime } from '../../lib/date-format.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { ActionMenu } from '../../components/ui/ActionMenu.jsx';
import styles from './SuperadminPanels.module.css';

export function HelpFeedbackPanel() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState(null);
  const [responseId, setResponseId] = useState(null);
  const [ackDrafts, setAckDrafts] = useState({});

  const [fbTarget, setFbTarget] = useState('Semua Siswa');
  const [fbPeriod, setFbPeriod] = useState('Minggu Berjalan');
  const [messageOpen, setMessageOpen] = useState(false);
  const [fbTitle, setFbTitle] = useState('');
  const [fbBody, setFbBody] = useState('');
  const [deleteFbTarget, setDeleteFbTarget] = useState(null);

  const helpQuery = useQuery({
    queryKey: ['superadmin', 'help-requests'],
    queryFn: () => apiRequest('/superadmin/help-requests'),
  });

  const feedbackQuery = useQuery({
    queryKey: ['superadmin', 'feedback'],
    queryFn: () => apiRequest('/superadmin/feedback'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      apiRequest(`/superadmin/help-requests/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'help-requests'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
      setNotice({ tone: 'success', text: 'Status permintaan bantuan diperbarui.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const ackMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      apiRequest(`/superadmin/help-requests/${id}/acknowledgement`, {
        method: 'PUT',
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'help-requests'] });
      setResponseId(null);
      setNotice({ tone: 'success', text: 'Respons administratif berhasil disimpan (satu arah).' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const createFbMutation = useMutation({
    mutationFn: (payload) => apiRequest('/superadmin/feedback', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'feedback'] });
      setMessageOpen(false);
      setFbTitle('');
      setFbBody('');
      setNotice({ tone: 'success', text: 'Pesan kelompok satu arah diterbitkan.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const deleteFbMutation = useMutation({
    mutationFn: (id) => apiRequest(`/superadmin/feedback/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'feedback'] });
      setDeleteFbTarget(null);
      setNotice({ tone: 'info', text: 'Pesan kelompok dihapus.' });
    },
  });

  return (
    <div className="stack-lg">
      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>

      <Card className="stack-md">
        <div className={styles.rowBetween}>
          <h2 className="cardTitle">Antrean Permintaan Bantuan (Kelola Superadmin)</h2>
          <Badge tone="neutral">{(helpQuery.data?.requests || []).length} Permintaan</Badge>
        </div>

        <div className="stack-md">
          {(helpQuery.data?.requests || []).map((reqItem) => {
            const draft = ackDrafts[reqItem.id] || {
              message: reqItem.acknowledgement?.message || '',
              locationInfo: reqItem.acknowledgement?.locationInfo || 'Ruang BK Gedung A Lt. 2',
              scheduleInfo: reqItem.acknowledgement?.scheduleInfo || '',
            };
            return (
              <div key={reqItem.id} className={styles.itemCard}>
                <div className={styles.rowBetween}>
                  <div className="cluster">
                    <strong>{reqItem.studentCode}</strong>
                    <Badge tone="neutral">{reqItem.studentGroup}</Badge>
                    <Badge tone={reqItem.status === 'closed' ? 'success' : 'lavender'}>
                      {reqItem.statusLabel}
                    </Badge>
                  </div>
                  <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                    {formatIndonesianDateTime(reqItem.createdAt)}
                  </span>
                </div>

                <div style={{ fontSize: 'var(--text-sm)' }}>
                  <strong>Guru tujuan:</strong> {reqItem.requestedCounselor || '-'} •{' '}
                  <strong>Waktu:</strong> {reqItem.preferredTime || '-'}
                  {reqItem.contact ? ` • Kontak: ${reqItem.contact}` : ''}
                </div>
                {reqItem.topicMessage && (
                  <p className={styles.quoteBlock}>{reqItem.topicMessage}</p>
                )}

                <div className="cluster">
                  <Button size="sm" variant="secondary" onClick={() => setResponseId(reqItem.id)}>
                    Tulis Respons
                  </Button>
                  <ActionMenu
                    label="Ubah Status"
                    items={[
                      reqItem.status === 'submitted' && {
                        label: 'Tandai Diterima',
                        disabled: statusMutation.isPending,
                        onClick: () =>
                          statusMutation.mutate({ id: reqItem.id, status: 'acknowledged' }),
                      },
                      ['submitted', 'acknowledged'].includes(reqItem.status) && {
                        label: 'Tindak Lanjut',
                        disabled: statusMutation.isPending,
                        onClick: () =>
                          statusMutation.mutate({ id: reqItem.id, status: 'follow_up' }),
                      },
                      ['submitted', 'acknowledged', 'follow_up'].includes(reqItem.status) && {
                        label: 'Tandai Selesai',
                        disabled: statusMutation.isPending,
                        onClick: () => statusMutation.mutate({ id: reqItem.id, status: 'closed' }),
                      },
                    ]}
                  />
                </div>
                <Dialog
                  open={responseId === reqItem.id}
                  onClose={() => setResponseId(null)}
                  title={`Respons untuk ${reqItem.studentCode}`}
                >
                  <div className="stack-sm">
                    <Textarea
                      label="Respons Administratif Satu Arah (tanpa chat konseling)"
                      value={draft.message}
                      onChange={(e) =>
                        setAckDrafts((prev) => ({
                          ...prev,
                          [reqItem.id]: { ...draft, message: e.target.value },
                        }))
                      }
                      placeholder="Informasi tindak lanjut dan jadwal yang sudah dikonfirmasi."
                    />
                    <div className={styles.twoColGrid}>
                      <Input
                        label="Lokasi"
                        value={draft.locationInfo}
                        onChange={(e) =>
                          setAckDrafts((prev) => ({
                            ...prev,
                            [reqItem.id]: { ...draft, locationInfo: e.target.value },
                          }))
                        }
                      />
                      <Input
                        label="Jadwal"
                        value={draft.scheduleInfo}
                        onChange={(e) =>
                          setAckDrafts((prev) => ({
                            ...prev,
                            [reqItem.id]: { ...draft, scheduleInfo: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={ackMutation.isPending}
                        onClick={() =>
                          ackMutation.mutate({
                            id: reqItem.id,
                            payload: draft,
                          })
                        }
                      >
                        Simpan Respons Administratif
                      </Button>
                    </div>
                  </div>
                  <StatusNotice tone="error">{ackMutation.error?.message}</StatusNotice>
                </Dialog>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="stack-md">
        <h2 className="cardTitle">Pesan Kelompok Satu Arah</h2>
        <Button onClick={() => setMessageOpen(true)} style={{ alignSelf: 'flex-start' }}>
          Tulis Pesan Kelompok
        </Button>
        <Dialog
          open={messageOpen}
          onClose={() => setMessageOpen(false)}
          title="Tulis Pesan Kelompok"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFbMutation.mutate({
                targetGroup: fbTarget,
                periodLabel: fbPeriod,
                title: fbTitle,
                body: fbBody,
                status: 'published',
              });
            }}
            className="stack-md"
          >
            <div className={styles.twoColGrid}>
              <Input
                label="Kelompok Tujuan"
                value={fbTarget}
                onChange={(e) => setFbTarget(e.target.value)}
                placeholder="Semua Siswa / Kelas XI"
                required
              />
              <Input
                label="Label Periode"
                value={fbPeriod}
                onChange={(e) => setFbPeriod(e.target.value)}
                required
              />
            </div>
            <Input
              label="Judul Pesan"
              value={fbTitle}
              onChange={(e) => setFbTitle(e.target.value)}
              required
            />
            <Textarea
              label="Isi Pesan (tanpa kode siswa atau kutipan pribadi)"
              value={fbBody}
              onChange={(e) => setFbBody(e.target.value)}
              required
            />
            <div>
              <Button type="submit" disabled={createFbMutation.isPending}>
                Terbitkan Pesan Kelompok
              </Button>
            </div>
          </form>
          <StatusNotice tone="error">{createFbMutation.error?.message}</StatusNotice>
        </Dialog>

        <div className="stack-sm">
          {(feedbackQuery.data?.messages || []).map((m) => (
            <div key={m.id} className={styles.listRow}>
              <div className={styles.listRowText}>
                <strong>{m.title}</strong> ({m.target_group})
                <div
                  className="muted-text"
                  style={{ fontSize: 'var(--text-sm)', maxWidth: '65ch' }}
                >
                  {m.body}
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setDeleteFbTarget(m)}>
                Hapus
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Dialog
        open={Boolean(deleteFbTarget)}
        onClose={() => setDeleteFbTarget(null)}
        title="Hapus Pesan Kelompok?"
        description={
          deleteFbTarget
            ? `Pesan "${deleteFbTarget.title}" akan dihapus dari daftar pesan kelompok siswa.`
            : null
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteFbTarget(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={deleteFbMutation.isPending}
              onClick={() => deleteFbTarget && deleteFbMutation.mutate(deleteFbTarget.id)}
            >
              {deleteFbMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Pesan'}
            </Button>
          </>
        }
      >
        <StatusNotice tone="error">{deleteFbMutation.error?.message}</StatusNotice>
      </Dialog>
    </div>
  );
}
