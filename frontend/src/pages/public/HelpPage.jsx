import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  Info,
  PhoneCall,
  Send,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDateTime } from '../../lib/date-format.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { hasPersonalAccess } from '../../features/auth/personal-access.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import styles from './HelpPage.module.css';

export function HelpPage() {
  const { authenticated, user, consentStatus, school } = useAuth();
  const queryClient = useQueryClient();

  const canUsePersonalHelp =
    authenticated && user?.role === 'student' && hasPersonalAccess(consentStatus);

  const [requestedCounselor, setRequestedCounselor] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [topicMessage, setTopicMessage] = useState('');
  const [contact, setContact] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [statusBanner, setStatusBanner] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const requestsQuery = useQuery({
    queryKey: ['help-requests', user?.id],
    queryFn: () => apiRequest('/help-requests'),
    enabled: Boolean(canUsePersonalHelp),
  });

  const submitMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest('/help-requests', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: payload,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['help-requests', user?.id] });
      setTopicMessage('');
      setContact('');
      setPreviewOpen(false);
      setIdempotencyKey(crypto.randomUUID());
      setStatusBanner({
        tone: 'success',
        text: res.deduplicated
          ? 'Permintaan yang sama sudah tercatat sebelumnya.'
          : school?.serviceHours
            ? 'Permintaan tersimpan. Pengelola meninjaunya sesuai jam layanan yang tercantum.'
            : 'Permintaan tersimpan. Jadwal layanan belum ditetapkan; tunggu tanggapan pengelola di aplikasi.',
      });
    },
    onError: (err) => {
      setStatusBanner({ tone: 'error', text: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (requestId) =>
      apiRequest(`/help-requests/${requestId}/status`, {
        method: 'PATCH',
        body: { status: 'cancelled' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests', user?.id] });
      setCancelTargetId(null);
      setStatusBanner({ tone: 'info', text: 'Permintaan bantuan berhasil dibatalkan.' });
    },
    onError: (err) => {
      setCancelTargetId(null);
      setStatusBanner({ tone: 'error', text: err.message });
    },
  });

  const contacts = school?.verifiedContacts || [];
  const serviceHours = school?.serviceHours || 'Jam layanan belum ditetapkan.';
  const handlerReady = Boolean(school?.activeHandlerConfigured);

  return (
    <div className="stack-lg">
      <header className="pageHeader">
        <h1 className="pageTitle">Butuh Bicara &amp; Bantuan</h1>
        <p className="pageLead">
          Informasi kontak resmi sekolah tersedia kapan saja. Kamu tidak harus menghadapi tekanan
          belajar sendirian.
        </p>
      </header>

      <Card className="stack-md">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div className="cluster">
            <Info size={18} color="var(--color-primary)" aria-hidden="true" />
            <strong style={{ fontSize: '1.05rem' }}>Batas Layanan Penting</strong>
          </div>
          <Badge tone="lime">Bukan Layanan Darurat 24 Jam</Badge>
        </div>
        <p style={{ margin: 0, fontWeight: 600, maxWidth: '68ch' }}>
          Bukan layanan darurat dan tidak dipantau setiap saat. Permintaan di aplikasi diterima oleh
          pengelola sekolah (Superadmin) untuk dikoordinasikan bersama layanan BK sesuai jam kerja.
        </p>
        <div className={styles.serviceHoursBox}>
          <strong>Jam Layanan ({school?.name || 'Sekolah belum dikonfigurasi'}):</strong>{' '}
          <span>{serviceHours}</span>
        </div>
        {contacts.length === 0 && (
          <StatusNotice tone="info">
            Kontak sekolah belum tersedia. Pengelola perlu mengisi kontak terverifikasi dan jam
            layanan resmi.
          </StatusNotice>
        )}
        <div className={styles.contactsGrid}>
          {contacts.map((c, idx) => (
            <div key={`${c.label}-${idx}`} className={styles.contactCard}>
              <div className={styles.contactLabel}>
                <PhoneCall size={15} aria-hidden="true" />
                <span>{c.label}</span>
              </div>
              <div className={styles.contactValue}>{c.value}</div>
              {c.note && (
                <div className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                  {c.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {!canUsePersonalHelp ? (
        <Card className="stack-md">
          <h2 className="cardTitle">Mengirim Permintaan Bantuan Melalui Aplikasi</h2>
          <p className="muted-text prose" style={{ margin: 0 }}>
            {authenticated && user?.role === 'student'
              ? 'Untuk mengirim permintaan bantuan tercatat melalui akunmu, setujui kebijakan data siswa terlebih dahulu atau hubungi kontak terverifikasi di atas.'
              : authenticated
                ? 'Formulir pengajuan bantuan siswa hanya digunakan oleh akun siswa. Kamu tetap dapat melihat informasi kontak publik di atas.'
                : 'Masuk dengan akun siswa untuk mengirim permintaan bantuan sukarela dan melacak statusnya.'}
          </p>
          {authenticated && user?.role === 'student' && (
            <div>
              <Link to="/app/persetujuan" className="btnLink">
                Lihat Persetujuan Data
              </Link>
            </div>
          )}
          {!authenticated && (
            <div>
              <Link to="/masuk" className="btnLinkPrimary">
                <span>Masuk ke Akun Siswa</span>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="stack-lg">
          <StatusNotice tone={statusBanner?.tone}>{statusBanner?.text}</StatusNotice>

          {!handlerReady && (
            <StatusNotice tone="error">
              Pengelola layanan sekolah belum ditetapkan. Pengiriman melalui formulir sementara
              dinonaktifkan; gunakan kontak terverifikasi di atas.
            </StatusNotice>
          )}

          <div className={styles.grid}>
            <Card className="stack-md">
              <div className="stack-sm">
                <h2 className="cardTitle">Kirim Permintaan Bantuan Sukarela</h2>
                <p
                  className="muted-text"
                  style={{ margin: 0, fontSize: 'var(--text-sm)', maxWidth: '65ch' }}
                >
                  Penerima administratif di aplikasi adalah <strong>Superadmin</strong> yang
                  mengoordinasikan layanan BK sekolah. Guru BK di aplikasi tidak membaca isi pesan
                  ini.
                </p>
              </div>

              <Input
                label="Guru BK yang ingin ditemui (opsional)"
                value={requestedCounselor}
                onChange={(e) => setRequestedCounselor(e.target.value)}
                maxLength={160}
                placeholder="Nama guru BK dari sekolah"
              />
              <Input
                label="Waktu yang diinginkan (opsional)"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                maxLength={120}
                placeholder="Waktu yang sesuai untukmu"
                helperText="Jadwal pertemuan ditentukan bersama pengelola sekolah."
              />

              <Textarea
                label="Pesan singkat (sukarela)"
                value={topicMessage}
                onChange={(e) => setTopicMessage(e.target.value)}
                maxLength={2000}
                currentLength={topicMessage.length}
                placeholder="Boleh dikosongkan jika kamu lebih nyaman berbicara langsung saat bertemu."
              />

              <Input
                label="Kontak tindak lanjut sukarela (opsional)"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Misal email sekolah atau nomor yang bisa dihubungi"
                helperText="Hanya dikirim jika kamu menuliskannya di sini."
              />

              <div className="cluster">
                <Button
                  variant="secondary"
                  disabled={!handlerReady}
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye size={17} aria-hidden="true" />
                  <span>Tinjau Permintaan</span>
                </Button>
              </div>
            </Card>

            <Card className={`stack-md ${styles.stickyPreview}`}>
              <div className="cluster">
                <ShieldCheck size={20} color="var(--color-primary)" aria-hidden="true" />
                <h2 className="cardTitle">Ringkasan Permintaan</h2>
              </div>

              <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                {previewOpen
                  ? 'Periksa data yang benar-benar akan dikirim sebelum menekan tombol Kirim:'
                  : 'Tekan "Tinjau Permintaan" setelah mengisi formulir untuk memeriksa ringkasan sebelum dikirim.'}
              </p>

              <div className={styles.previewBox}>
                <div className={styles.previewRow}>
                  <span className="muted-text">Penerima di Aplikasi</span>
                  <strong>Superadmin Sekolah</strong>
                </div>
                <div className={styles.previewRow}>
                  <span className="muted-text">Kode Siswa</span>
                  <strong>{user?.accountCode}</strong>
                </div>
                <div className={styles.previewRow}>
                  <span className="muted-text">Guru Tujuan</span>
                  <span>{requestedCounselor || '(Tidak dipilih)'}</span>
                </div>
                <div className={styles.previewRow}>
                  <span className="muted-text">Waktu Pilihan</span>
                  <span>{preferredTime || '(Belum ditentukan)'}</span>
                </div>
                <div className={styles.previewRow}>
                  <span className="muted-text">Kontak Sukarela</span>
                  <span>{contact.trim() || '(Tidak dilampirkan)'}</span>
                </div>
                <div>
                  <span
                    className="muted-text"
                    style={{ fontSize: 'var(--text-xs)', display: 'block' }}
                  >
                    Pesan:
                  </span>
                  <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>
                    {topicMessage.trim() || '(Tidak menulis pesan)'}
                  </p>
                </div>
              </div>

              <StatusNotice tone="info">
                Isi jurnal, nilai mood, refleksi mingguan, dan hasil skrining TIDAK dilampirkan
                secara otomatis ke permintaan bantuan ini.
              </StatusNotice>

              {previewOpen && (
                <Button
                  variant="primary"
                  fullWidth
                  disabled={!handlerReady || submitMutation.isPending}
                  onClick={() =>
                    submitMutation.mutate({
                      requestedCounselor,
                      preferredTime,
                      topicMessage: topicMessage.trim() || null,
                      contact: contact.trim() || null,
                    })
                  }
                >
                  <Send size={17} aria-hidden="true" />
                  <span>
                    {submitMutation.isPending ? 'Mengirim...' : 'Kirim Permintaan ke Superadmin'}
                  </span>
                </Button>
              )}
            </Card>
          </div>

          <Card className="stack-md">
            <div className="stack-sm">
              <h2 className="cardTitle">Status Permintaan Bantuanmu</h2>
              <p
                className="muted-text"
                style={{ margin: 0, fontSize: 'var(--text-sm)', maxWidth: '65ch' }}
              >
                Status &ldquo;Terkirim&rdquo; berarti permintaanmu sudah masuk dan akan diperiksa
                pada jam layanan sekolah.
              </p>
            </div>

            {requestsQuery.isLoading ? (
              <LoadingState message="Memuat status bantuan..." />
            ) : requestsQuery.isError ? (
              <ErrorState
                message={requestsQuery.error.message}
                onRetry={() => requestsQuery.refetch()}
              />
            ) : (requestsQuery.data?.requests || []).length === 0 ? (
              <EmptyState
                title="Belum ada permintaan bantuan"
                description="Jika kamu ingin berbicara dengan Guru BK sekolah, kamu dapat mengisi formulir sukarela di atas kapan saja."
              />
            ) : (
              <div className="stack-md">
                {requestsQuery.data.requests.map((reqItem) => {
                  const cancellable = ['submitted', 'acknowledged', 'follow_up'].includes(
                    reqItem.status
                  );
                  return (
                    <div key={reqItem.id} className={styles.requestCard}>
                      <div className="cluster" style={{ justifyContent: 'space-between' }}>
                        <div className="cluster">
                          <Badge
                            tone={
                              reqItem.status === 'closed'
                                ? 'success'
                                : reqItem.status === 'cancelled'
                                  ? 'neutral'
                                  : 'lavender'
                            }
                          >
                            <CheckCircle2 size={14} aria-hidden="true" />
                            <span>{reqItem.statusLabel}</span>
                          </Badge>
                          <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                            {formatIndonesianDateTime(reqItem.createdAt, school?.timezone)}
                          </span>
                        </div>

                        {cancellable && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={cancelMutation.isPending}
                            onClick={() => setCancelTargetId(reqItem.id)}
                          >
                            <XCircle size={15} aria-hidden="true" />
                            <span>Batalkan Permintaan</span>
                          </Button>
                        )}
                      </div>

                      <div className={styles.requestMeta}>
                        <strong>Tujuan:</strong> {reqItem.requestedCounselor || '-'} •{' '}
                        <strong>Waktu:</strong> {reqItem.preferredTime || '-'}
                      </div>
                      {reqItem.topicMessage && (
                        <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                          &ldquo;{reqItem.topicMessage}&rdquo;
                        </p>
                      )}

                      {reqItem.acknowledgement && (
                        <div className={styles.ackBox}>
                          <strong
                            style={{
                              fontSize: 'var(--text-sm)',
                              color: 'var(--color-primary-hover)',
                            }}
                          >
                            Respons Administratif Pengelola (v{reqItem.acknowledgement.version}):
                          </strong>
                          <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                            {reqItem.acknowledgement.message}
                          </p>
                          {(reqItem.acknowledgement.locationInfo ||
                            reqItem.acknowledgement.scheduleInfo) && (
                            <div
                              className="muted-text"
                              style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}
                            >
                              {reqItem.acknowledgement.locationInfo}{' '}
                              {reqItem.acknowledgement.scheduleInfo
                                ? `• ${reqItem.acknowledgement.scheduleInfo}`
                                : ''}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Dialog
            open={Boolean(cancelTargetId)}
            title="Batalkan Permintaan Bantuan?"
            description="Permintaan yang dibatalkan tetap tersimpan di riwayat dengan status dibatalkan, dan kamu bisa mengirim permintaan baru kapan saja."
            onClose={() => setCancelTargetId(null)}
            actions={
              <>
                <Button variant="secondary" onClick={() => setCancelTargetId(null)}>
                  Kembali
                </Button>
                <Button
                  variant="danger"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelTargetId && cancelMutation.mutate(cancelTargetId)}
                >
                  {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan Permintaan'}
                </Button>
              </>
            }
          />
        </div>
      )}
    </div>
  );
}
