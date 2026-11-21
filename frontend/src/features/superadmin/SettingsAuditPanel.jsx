import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ClipboardCheck, Download, Gauge } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDateTime } from '../../lib/date-format.js';
import { triggerBlobDownload } from '../../lib/pwa.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { Disclosure } from '../../components/ui/Disclosure.jsx';
import { ActionMenu } from '../../components/ui/ActionMenu.jsx';
import styles from './SuperadminPanels.module.css';
import { ConsentPolicyPanel } from './ConsentPolicyPanel.jsx';

const REVIEW_STATUS_LABELS = {
  pending_review: 'Menunggu Tinjauan',
  needs_revision: 'Perlu Revisi',
  approved: 'Disahkan',
  deferred: 'Ditunda',
};

export function SettingsAuditPanel() {
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  const settingsQuery = useQuery({
    queryKey: ['superadmin', 'settings'],
    queryFn: () => apiRequest('/superadmin/settings'),
  });

  const auditQuery = useQuery({
    queryKey: ['superadmin', 'audit'],
    queryFn: () => apiRequest('/superadmin/audit?limit=40'),
  });

  const governanceQuery = useQuery({
    queryKey: ['superadmin', 'governance-reviews'],
    queryFn: () => apiRequest('/superadmin/governance-reviews'),
  });

  const capacityQuery = useQuery({
    queryKey: ['superadmin', 'capacity'],
    queryFn: () => apiRequest('/superadmin/capacity'),
  });

  const schoolsQuery = useQuery({
    queryKey: ['superadmin', 'schools'],
    queryFn: () => apiRequest('/superadmin/schools'),
  });

  const [schoolName, setSchoolName] = useState('');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [serviceHours, setServiceHours] = useState('');
  const [guardianRequired, setGuardianRequired] = useState(false);
  const [personalAccessMode, setPersonalAccessMode] = useState('account_approval');
  const [handlerConfigured, setHandlerConfigured] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [newContactLabel, setNewContactLabel] = useState('');
  const [newContactValue, setNewContactValue] = useState('');
  const [newContactNote, setNewContactNote] = useState('');

  const screeningInstrumentsQuery = useQuery({
    queryKey: ['superadmin', 'screening-instruments'],
    queryFn: () => apiRequest('/superadmin/screening-instruments'),
  });

  // State form tinjauan T73
  const [editingReview, setEditingReview] = useState(null);
  const [revStatus, setRevStatus] = useState('needs_revision');
  const [revName, setRevName] = useState('');
  const [revRole, setRevRole] = useState('guru_bk');
  const [revDecision, setRevDecision] = useState('');
  const [revRevision, setRevRevision] = useState('');

  // State ekspor L04
  const [exportPassword, setExportPassword] = useState('');
  const [exportNotice, setExportNotice] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);

  // State tambah sekolah L05
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolTz, setNewSchoolTz] = useState('Asia/Jakarta');
  const [newSchoolMax, setNewSchoolMax] = useState('500');
  const [newSchoolRetention, setNewSchoolRetention] = useState('90');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [createdTokenNotice, setCreatedTokenNotice] = useState(null);

  useEffect(() => {
    const s = settingsQuery.data?.school;
    if (s) {
      setSchoolName(s.name);
      setTimezone(s.timezone);
      setServiceHours(s.service_hours);
      setGuardianRequired(Boolean(s.guardian_consent_required));
      setPersonalAccessMode(s.personal_access_mode || 'consent');
      setHandlerConfigured(Boolean(s.active_handler_configured));
      setContacts(Array.isArray(s.verified_contacts) ? s.verified_contacts : []);
    }
  }, [settingsQuery.data]);

  const saveSettingsMutation = useMutation({
    mutationFn: (payload) => apiRequest('/superadmin/settings', { method: 'PATCH', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'config'] });
      setSettingsOpen(false);
      setNotice({ tone: 'success', text: 'Pengaturan sekolah diperbarui dan dicatat di audit.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const runJobMutation = useMutation({
    mutationFn: (endpoint) => apiRequest(endpoint, { method: 'POST', body: {} }),
    onSuccess: (_res, endpoint) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'audit'] });
      setNotice({
        tone: 'success',
        text: endpoint.includes('aggregate')
          ? 'Snapshot mingguan dihitung ulang dengan supresi k=5.'
          : 'Job pembersihan retensi selesai dijalankan.',
      });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const saveReviewMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      apiRequest(`/superadmin/governance-reviews/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'governance-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'audit'] });
      setEditingReview(null);
      setNotice({
        tone: 'success',
        text: 'Keputusan tinjauan ahli/sekolah (T73) disimpan ke audit.',
      });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const createSchoolMutation = useMutation({
    mutationFn: (payload) => apiRequest('/superadmin/schools', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'schools'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'capacity'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'config'] });
      setCreatedTokenNotice(
        'Sekolah dan admin awal berhasil dibuat. Admin dapat masuk menggunakan email dan sandi yang ditetapkan.'
      );
      setSchoolOpen(false);
      setNewSchoolCode('');
      setNewSchoolName('');
      setNewAdminCode('');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  async function handleExportAggregate(format) {
    setExportBusy(true);
    setExportNotice(null);
    try {
      const res = await apiRequest('/exports/superadmin-aggregate', {
        method: 'POST',
        body: { currentPassword: exportPassword, format, includeAuditSummary: true },
        responseType: format === 'csv' ? 'text' : 'json',
      });
      setExportPassword('');
      triggerBlobDownload({
        filename: `tenangin-ekspor-superadmin.${format}`,
        content: format === 'csv' ? res : JSON.stringify(res, null, 2),
        mimeType: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
      });
      setExportNotice({
        tone: 'success',
        text: `Ekspor agregat & ringkasan audit (${format.toUpperCase()}) berhasil diunduh.`,
      });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'audit'] });
    } catch (err) {
      setExportNotice({ tone: 'error', text: err.message });
    } finally {
      setExportBusy(false);
    }
  }

  const cap = capacityQuery.data;

  return (
    <div className="stack-lg">
      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>
      <StatusNotice tone="error">{settingsQuery.error?.message}</StatusNotice>

      {personalAccessMode === 'consent' && (
        <ConsentPolicyPanel
          policies={settingsQuery.data?.consentPolicies}
          loading={settingsQuery.isLoading}
          error={settingsQuery.error}
        />
      )}

      <Card className="stack-md">
        <h2 className="cardTitle">Konfigurasi Sekolah &amp; Layanan</h2>
        <p className="muted-text" style={{ margin: 0 }}>
          {settingsQuery.data?.school?.name} · {settingsQuery.data?.school?.timezone}
          <br />
          {settingsQuery.data?.school?.service_hours}
        </p>
        <div className="cluster">
          <Button disabled={!settingsQuery.data?.school} onClick={() => setSettingsOpen(true)}>
            Edit Pengaturan Sekolah
          </Button>
          <ActionMenu
            label="Pemeliharaan"
            items={[
              {
                label: 'Hitung Ulang Snapshot Mingguan',
                disabled: runJobMutation.isPending,
                onClick: () => runJobMutation.mutate('/superadmin/jobs/aggregate-weekly'),
              },
              {
                label: 'Jalankan Pembersihan Retensi',
                disabled: runJobMutation.isPending,
                onClick: () => runJobMutation.mutate('/superadmin/jobs/cleanup-retention'),
              },
            ]}
          />
        </div>
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title="Konfigurasi Sekolah & Layanan"
          size="lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSettingsMutation.mutate({
                name: schoolName,
                timezone,
                serviceHours,
                verifiedContacts: contacts,
                guardianConsentRequired: guardianRequired,
                personalAccessMode,
                activeHandlerConfigured: handlerConfigured,
              });
            }}
            className="stack-md"
          >
            <div className={styles.twoColGrid}>
              <Input
                label="Nama Sekolah"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
              <Select
                label="Zona Waktu Sekolah"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
              </Select>
            </div>
            <Input
              label="Jam Layanan BK Sekolah"
              value={serviceHours}
              onChange={(e) => setServiceHours(e.target.value)}
            />
            <Select
              label="Akses Fitur Siswa"
              value={personalAccessMode}
              onChange={(event) => {
                setPersonalAccessMode(event.target.value);
                if (event.target.value === 'account_approval') setGuardianRequired(false);
              }}
            >
              <option value="account_approval">Langsung setelah akun disetujui</option>
              <option value="consent">Memerlukan persetujuan kebijakan data</option>
            </Select>
            {personalAccessMode === 'consent' && (
              <Switch
                checked={guardianRequired}
                onChange={setGuardianRequired}
                label="Wajib verifikasi persetujuan wali sebelum fitur pribadi aktif"
              />
            )}
            <Switch
              checked={handlerConfigured}
              onChange={setHandlerConfigured}
              label="Pengelola layanan bantuan aktif ditetapkan"
            />

            {/* Pengelola Kontak Layanan Terverifikasi */}
            <div
              className="stack-sm"
              style={{
                border: '1px solid var(--color-border)',
                padding: '1rem',
                borderRadius: 'var(--radius-card)',
                background: 'var(--color-surface)',
              }}
            >
              <div className={styles.rowBetween}>
                <strong>Kontak Layanan Sekolah &amp; Darurat ({contacts.length})</strong>
                <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                  Maksimal 10 kontak
                </span>
              </div>
              {contacts.length === 0 ? (
                <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                  Belum ada kontak terverifikasi yang didaftarkan.
                </p>
              ) : (
                contacts.map((c, idx) => (
                  <div
                    key={idx}
                    className={styles.itemCard}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <strong>{c.label}: </strong>
                      <span>{c.value}</span>
                      {c.note ? <span className="muted-text"> ({c.note})</span> : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
                    >
                      Hapus
                    </Button>
                  </div>
                ))
              )}
              <div
                className="cluster"
                style={{ gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
              >
                <div style={{ flex: '1 1 180px' }}>
                  <Input
                    label="Label (mis: Ruang BK)"
                    value={newContactLabel}
                    onChange={(e) => setNewContactLabel(e.target.value)}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <Input
                    label="Kontak (Telepon/WhatsApp/Lokasi)"
                    value={newContactValue}
                    onChange={(e) => setNewContactValue(e.target.value)}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <Input
                    label="Catatan (opsional)"
                    value={newContactNote}
                    onChange={(e) => setNewContactNote(e.target.value)}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={
                    !newContactLabel.trim() || !newContactValue.trim() || contacts.length >= 10
                  }
                  onClick={() => {
                    setContacts([
                      ...contacts,
                      {
                        label: newContactLabel.trim(),
                        value: newContactValue.trim(),
                        note: newContactNote.trim(),
                      },
                    ]);
                    setNewContactLabel('');
                    setNewContactValue('');
                    setNewContactNote('');
                  }}
                >
                  + Tambah Kontak
                </Button>
              </div>
            </div>

            <div className="cluster">
              <Button type="submit" disabled={saveSettingsMutation.isPending}>
                Simpan Pengaturan Sekolah
              </Button>
            </div>
          </form>
          <StatusNotice tone="error">{saveSettingsMutation.error?.message}</StatusNotice>
        </Dialog>
      </Card>

      {/* T73 Domain D2: Status & Template Instrumen Skrining */}
      <Disclosure title="Instrumen Skrining Mandiri">
        <div className="stack-md">
          <div className={styles.rowBetween}>
            <div className="cluster">
              <ClipboardCheck size={18} color="var(--color-primary)" aria-hidden="true" />
              <h2 className="cardTitle">Instrumen Skrining Mandiri</h2>
            </div>
            <Badge
              tone={screeningInstrumentsQuery.data?.hasApprovedInstrument ? 'success' : 'lavender'}
            >
              {screeningInstrumentsQuery.data?.hasApprovedInstrument
                ? 'Instrumen Tervalidasi Aktif'
                : 'Instrumen belum tersedia'}
            </Badge>
          </div>
          <p className="muted-text" style={{ margin: 0 }}>
            Skrining tersedia setelah instrumen, hak penggunaan, aturan skoring, dan referensi
            pengesahan ditetapkan oleh ahli yang berwenang.
          </p>
        </div>
      </Disclosure>

      {/* T73: Workflow Pencatatan Tinjauan Ahli & Pengelola Sekolah */}
      <Disclosure title="Tinjauan Ahli & Sekolah">
        <div className="stack-md">
          <div className={styles.rowBetween}>
            <div className="cluster">
              <ClipboardCheck size={18} color="var(--color-primary)" aria-hidden="true" />
              <h2 className="cardTitle">Tinjauan Ahli &amp; Pengelola Sekolah (Prasyarat Pilot)</h2>
            </div>
            <Badge tone={governanceQuery.data?.pilotGateReady ? 'success' : 'warning'}>
              {governanceQuery.data?.pilotGateReady
                ? 'Semua Domain Disahkan'
                : `${governanceQuery.data?.approvedCount ?? 0} / ${governanceQuery.data?.totalCount ?? 8} Disahkan`}
            </Badge>
          </div>
          <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Seluruh keputusan ahli materi/media, guru BK, dan pengelola sekolah dicatat di sini
            beserta log revisi sebelum layanan diaktifkan untuk siswa.
          </p>

          <div className="stack-sm">
            {(governanceQuery.data?.reviews || []).map((rev) => (
              <div key={rev.id} className={styles.itemCard}>
                <div className={styles.twoColActionRow}>
                  <div>
                    <strong>{rev.title}</strong>
                    <div className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                      {rev.scopeSummary}
                    </div>
                  </div>
                  <div className="cluster">
                    <Badge
                      tone={
                        rev.status === 'approved'
                          ? 'success'
                          : rev.status === 'needs_revision'
                            ? 'danger'
                            : 'lavender'
                      }
                    >
                      {REVIEW_STATUS_LABELS[rev.status] || rev.status}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingReview(rev);
                        setRevStatus(
                          rev.status === 'pending_review' ? 'needs_revision' : rev.status
                        );
                        setRevName(rev.reviewerName || '');
                        setRevRole(rev.reviewerRole || 'guru_bk');
                        setRevDecision(rev.decisionNotes || '');
                        setRevRevision(rev.revisionNotes || '');
                      }}
                    >
                      Catat Keputusan
                    </Button>
                  </div>
                </div>
                {rev.reviewerName && (
                  <div className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                    Peninjau: <strong>{rev.reviewerName}</strong> ({rev.reviewerRole}) • Versi{' '}
                    {rev.version}
                    {rev.decisionNotes ? ` — ${rev.decisionNotes}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Dialog
            open={Boolean(editingReview)}
            onClose={() => setEditingReview(null)}
            title="Catatan Tinjauan"
            size="lg"
          >
            {editingReview && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveReviewMutation.mutate({
                    id: editingReview.id,
                    payload: {
                      status: revStatus,
                      reviewerName: revName,
                      reviewerRole: revRole,
                      decisionNotes: revDecision,
                      revisionNotes: revRevision,
                    },
                  });
                }}
                className={styles.editorBox}
              >
                <strong>Form Catatan Tinjauan: {editingReview.title}</strong>
                <div className={styles.formGrid}>
                  <Input
                    label="Nama Peninjau"
                    value={revName}
                    onChange={(e) => setRevName(e.target.value)}
                    required
                  />
                  <Select
                    label="Peran Peninjau"
                    aria-label="Peran peninjau"
                    value={revRole}
                    onChange={(e) => setRevRole(e.target.value)}
                  >
                    <option value="guru_bk">Guru BK</option>
                    <option value="ahli_materi">Ahli Materi</option>
                    <option value="ahli_media">Ahli Media</option>
                    <option value="pengelola_sekolah">Pengelola Sekolah</option>
                  </Select>
                  <Select
                    label="Status Tinjauan"
                    aria-label="Status tinjauan"
                    value={revStatus}
                    onChange={(e) => setRevStatus(e.target.value)}
                  >
                    <option value="needs_revision">Perlu Revisi</option>
                    <option value="approved">Disahkan</option>
                    <option value="deferred">Ditunda</option>
                    <option value="pending_review">Menunggu Tinjauan</option>
                  </Select>
                </div>
                <Input
                  label="Ringkasan Keputusan T73"
                  value={revDecision}
                  onChange={(e) => setRevDecision(e.target.value)}
                  required
                  placeholder="Naskah latihan napas disetujui dengan revisi kalimat jeda."
                />
                <Input
                  label="Catatan Revisi (opsional)"
                  value={revRevision}
                  onChange={(e) => setRevRevision(e.target.value)}
                />
                <div className="cluster">
                  <Button type="submit" size="sm" disabled={saveReviewMutation.isPending}>
                    Simpan Catatan T73
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingReview(null)}>
                    Batal
                  </Button>
                </div>
              </form>
            )}
            <StatusNotice tone="error">{saveReviewMutation.error?.message}</StatusNotice>
          </Dialog>
        </div>
      </Disclosure>

      {/* L04: Ekspor Agregat & Audit Superadmin */}
      <Disclosure title="Ekspor Agregat & Audit">
        <div className="stack-md">
          <div className="cluster">
            <Download size={18} color="var(--color-primary)" aria-hidden="true" />
            <h2 className="cardTitle">Ekspor Agregat &amp; Ringkasan Audit (Verifikasi Sandi)</h2>
          </div>
          <StatusNotice tone={exportNotice?.tone}>{exportNotice?.text}</StatusNotice>
          <div className="cluster" style={{ alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Input
                label="Konfirmasi kata sandi Superadmin untuk ekspor"
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={exportBusy || !exportPassword}
              onClick={() => handleExportAggregate('json')}
            >
              Unduh JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={exportBusy || !exportPassword}
              onClick={() => handleExportAggregate('csv')}
            >
              Unduh CSV
            </Button>
          </div>
        </div>
      </Disclosure>

      {/* L05: Kapasitas & Perluasan Multi-Sekolah */}
      <Disclosure title="Kapasitas & Sekolah Mitra">
        <div className="stack-md">
          <div className={styles.rowBetween}>
            <div className="cluster">
              <Gauge size={18} color="var(--color-primary)" aria-hidden="true" />
              <h2 className="cardTitle">Kapasitas Sistem &amp; Sekolah Mitra</h2>
            </div>
            {cap && (
              <Badge tone="lavender">
                Pool DB: {cap.pool.used} dipakai / {cap.pool.max} maks (timeout{' '}
                {cap.pool.statementTimeoutMs} ms)
              </Badge>
            )}
          </div>

          {cap && (
            <div className={styles.kpiGrid}>
              <div className={styles.statTile}>
                <span className={styles.kpiLabel}>Kuota Siswa Sekolah</span>
                <div className={styles.statTileValue}>
                  {cap.schoolQuota.studentCount} / {cap.schoolQuota.maxStudents} (
                  {cap.schoolQuota.quotaUsagePct}%)
                </div>
              </div>
              <div className={styles.statTile}>
                <span className={styles.kpiLabel}>Langganan Push Aktif</span>
                <div className={styles.statTileValue}>{cap.volume.activePushSubscriptions}</div>
              </div>
              <div className={styles.statTile}>
                <span className={styles.kpiLabel}>Masa Retensi Aktif</span>
                <div className={styles.statTileValue}>{cap.schoolQuota.retentionDays} hari</div>
              </div>
            </div>
          )}

          <div className="stack-sm">
            <div className="cluster">
              <Building2 size={16} color="var(--color-primary)" aria-hidden="true" />
              <strong>Daftar Sekolah Terdaftar (Data Terpisah per Sekolah)</strong>
            </div>
            {(schoolsQuery.data?.schools || []).map((s) => (
              <div key={s.id} className={styles.listRow}>
                <span>
                  <strong>{s.code}</strong> — {s.name} ({s.timezone})
                </span>
                <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
                  Siswa {s.counts.student}/{s.maxStudents} • BK {s.counts.bk} • Retensi{' '}
                  {s.retentionDays}h
                </span>
              </div>
            ))}
          </div>

          <StatusNotice tone={createdTokenNotice ? 'success' : null}>
            {createdTokenNotice}
          </StatusNotice>
          <Button onClick={() => setSchoolOpen(true)} style={{ alignSelf: 'flex-start' }}>
            Tambah Sekolah Mitra
          </Button>
          <Dialog
            open={schoolOpen}
            onClose={() => setSchoolOpen(false)}
            title="Tambah Sekolah Mitra"
            size="lg"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSchoolMutation.mutate({
                  code: newSchoolCode,
                  name: newSchoolName,
                  timezone: newSchoolTz,
                  maxStudents: Number(newSchoolMax),
                  retentionDays: Number(newSchoolRetention),
                  adminAccountCode: newAdminCode,
                  adminDisplayName: newAdminName,
                  adminLoginEmail: newAdminEmail,
                  adminPassword: newAdminPassword,
                });
              }}
              className={styles.editorBox}
            >
              <strong>Tambah Sekolah Mitra Baru</strong>
              <div className={styles.formGrid}>
                <Input
                  label="Kode Sekolah (kapital)"
                  value={newSchoolCode}
                  onChange={(e) => setNewSchoolCode(e.target.value)}
                  placeholder="SMA-MITRA-02"
                  required
                />
                <Input
                  label="Nama Sekolah Mitra"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="SMA Negeri 2 Mitra"
                  required
                />
                <Input
                  label="Kuota Maks Siswa"
                  type="number"
                  min={10}
                  max={10000}
                  value={newSchoolMax}
                  onChange={(e) => setNewSchoolMax(e.target.value)}
                  required
                />
                <Input
                  label="Retensi (Hari)"
                  type="number"
                  min={30}
                  max={365}
                  value={newSchoolRetention}
                  onChange={(e) => setNewSchoolRetention(e.target.value)}
                  required
                />
                <Select
                  label="Zona Waktu"
                  aria-label="Zona waktu sekolah baru"
                  value={newSchoolTz}
                  onChange={(e) => setNewSchoolTz(e.target.value)}
                >
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                </Select>
                <Input
                  label="Kode Admin Awal"
                  value={newAdminCode}
                  onChange={(e) => setNewAdminCode(e.target.value)}
                  placeholder="Admin-Mitra-02"
                  required
                />
                <Input
                  label="Nama Admin Awal"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Admin SMA Mitra 2"
                  required
                />
              </div>
              <div className={styles.formGrid}>
                <Input
                  label="Email Admin Awal"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                />
                <Input
                  label="Sandi Admin Awal"
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={createSchoolMutation.isPending}
                >
                  Tambah Sekolah Baru
                </Button>
              </div>
            </form>
            <StatusNotice tone="error">{createSchoolMutation.error?.message}</StatusNotice>
          </Dialog>
        </div>
      </Disclosure>

      <Card className="stack-md">
        <h2 className="cardTitle">Log Audit Sistem (Tersanitasi)</h2>
        <div>
          {(auditQuery.data?.events || []).map((ev) => (
            <div key={ev.id} className={styles.auditRow}>
              <div className="stack-sm" style={{ gap: 4 }}>
                <div className="cluster" style={{ gap: 8 }}>
                  <Badge tone={ev.outcome === 'denied' ? 'danger' : 'lavender'}>{ev.action}</Badge>
                  <strong>{ev.actor_code || ev.actor_role}</strong>
                </div>
                <div className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
                  {ev.summary}
                </div>
              </div>
              <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                {formatIndonesianDateTime(ev.created_at)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
