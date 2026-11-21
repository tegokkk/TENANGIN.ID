import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Download, Eye, ShieldCheck, Users } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import {
  formatIndonesianDate,
  formatIndonesianDateTime,
  formatSecondsMMSS,
} from '../../lib/date-format.js';
import { triggerBlobDownload } from '../../lib/pwa.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { EmptyState } from '../../components/states/EmptyState.jsx';
import { SuppressedDataState } from '../../components/states/SuppressedDataState.jsx';
import styles from './DashboardPage.module.css';

const PAGE_SIZE = 20;

export function CounselorDashboardPage() {
  const { user, school } = useAuth();
  const [activityType, setActivityType] = useState('ALL');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [searchCode, setSearchCode] = useState('');
  const [page, setPage] = useState(1);
  const [exportPassword, setExportPassword] = useState('');
  const [exportNotice, setExportNotice] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  async function handleExportBkAggregate(format) {
    setExportLoading(true);
    setExportNotice(null);
    try {
      const res = await apiRequest('/exports/bk-aggregate', {
        method: 'POST',
        body: { currentPassword: exportPassword, format },
        responseType: format === 'csv' ? 'text' : 'json',
      });
      setExportPassword('');
      triggerBlobDownload({
        filename: `tenangin-agregat-bk-${user?.accountCode || 'bk'}.${format}`,
        content: format === 'csv' ? res : JSON.stringify(res, null, 2),
        mimeType: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
      });
      setExportNotice({
        tone: 'success',
        text: `Ekspor agregat tersupresi (${format.toUpperCase()}) berhasil diunduh dan tercatat di audit.`,
      });
    } catch (err) {
      setExportNotice({ tone: 'error', text: err.message });
    } finally {
      setExportLoading(false);
    }
  }

  const dashboardQuery = useQuery({
    queryKey: ['bk', 'dashboard', user?.id],
    queryFn: () => apiRequest('/bk/dashboard'),
  });

  const activitiesQuery = useQuery({
    queryKey: ['bk', 'activities', user?.id, activityType, selectedGroup, searchCode, page],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('activityType', activityType);
      if (selectedGroup !== 'ALL') params.set('gradeGroup', selectedGroup);
      if (searchCode.trim()) params.set('q', searchCode.trim());
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      return apiRequest(`/bk/activities?${params.toString()}`);
    },
  });

  const dash = dashboardQuery.data;
  const assignedGroups = dash?.counselor?.assignedGroups || [];
  const snapshotsByGroup = dash?.snapshotsByGroup || {};
  const pagination = activitiesQuery.data?.pagination || { page, limit: PAGE_SIZE, total: 0 };
  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / PAGE_SIZE));

  return (
    <div className="stack-lg">
      <header className="pageHeader">
        <div className="cluster">
          <Badge tone="lavender">
            <Eye size={14} aria-hidden="true" />
            <span>Akses Pemantauan (Read-Only)</span>
          </Badge>
          {dash?.weekStart && (
            <Badge tone="neutral">
              Snapshot Minggu Selesai: {formatIndonesianDate(dash.weekStart, school?.timezone)} –{' '}
              {formatIndonesianDate(dash.weekEnd, school?.timezone)}
            </Badge>
          )}
        </div>
        <h1 className="pageTitle">Dashboard BK</h1>
        <p className="pageLead">
          Konselor: <strong>{dash?.counselor?.displayName || user?.displayName}</strong> • Kelompok
          penugasan aktif: <strong>{assignedGroups.join(', ') || 'Belum ada penugasan'}</strong>
        </p>
      </header>

      <Card tone="lavender">
        <div className={styles.privacyRow}>
          <span className={styles.privacyIcon}>
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div className="stack-sm">
            <strong>Batas Privasi &amp; Kewenangan Guru BK (Read-Only)</strong>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
              Halaman ini hanya menampilkan metadata penggunaan siswa sesuai penugasan dan ringkasan
              agregat yang memenuhi ambang minimum{' '}
              <strong>k = {dash?.suppressionThreshold || 5}</strong> siswa. Isi jurnal, refleksi,
              nilai mood, jawaban skrining, rincian tugas, serta pesan bantuan tidak ditampilkan
              atau dikelola dari ruang ini.
            </p>
          </div>
        </div>
      </Card>

      {dashboardQuery.isLoading ? (
        <LoadingState message="Memuat ringkasan agregat aman..." />
      ) : dashboardQuery.isError ? (
        <ErrorState
          message={dashboardQuery.error.message}
          onRetry={() => dashboardQuery.refetch()}
        />
      ) : assignedGroups.length === 0 ? (
        <EmptyState
          title="Belum ada kelompok penugasan aktif"
          description="Hubungi Superadmin sekolah untuk menetapkan kelompok pemantauan BK."
        />
      ) : (
        <div className="stack-md">
          {Object.entries(snapshotsByGroup).map(([groupName, items]) => (
            <section key={groupName} className="stack-sm">
              <div className="cluster">
                <Users size={18} color="var(--color-primary)" aria-hidden="true" />
                <h2 className="cardTitle">Ringkasan Mingguan — {groupName}</h2>
              </div>

              <div className={styles.metricsGrid}>
                {items.map((metric) =>
                  metric.isSuppressed ? (
                    <SuppressedDataState
                      key={`${groupName}-${metric.metricKey}`}
                      title={metric.metricLabel}
                      description={metric.suppressionReason}
                    />
                  ) : (
                    <Card key={`${groupName}-${metric.metricKey}`} className="stack-sm">
                      <span className={styles.metricLabel}>{metric.metricLabel}</span>
                      <div className={styles.metricValue}>
                        {metric.value}
                        {metric.metricKey === 'weekly_mood_average' ? ' / 5' : ' siswa'}
                      </div>
                      <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
                        Kontributor berbeda: {metric.contributorCount} (k &ge; 5 terpenuhi)
                      </span>
                      {metric.payload?.topStrategies?.length > 0 && (
                        <div className="cluster" style={{ marginTop: 4 }}>
                          {metric.payload.topStrategies.map((st) => (
                            <Badge key={st.tag} tone="lavender">
                              {st.tag} ({Math.round(st.proportion * 100)}%)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <Card className="stack-md">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div className="cluster">
            <Activity size={20} color="var(--color-primary)" aria-hidden="true" />
            <h2 className="cardTitle">Log Metadata Aktivitas Siswa (Read-Only)</h2>
          </div>
          <Badge tone="neutral">Tanpa Isi Pribadi</Badge>
        </div>

        <div className={styles.filterGrid}>
          <Select
            label="Kelompok Penugasan"
            aria-label="Filter kelompok penugasan"
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Kelompok Penugasan</option>
            {assignedGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>

          <Select
            label="Jenis Aktivitas"
            aria-label="Filter jenis aktivitas"
            value={activityType}
            onChange={(e) => {
              setActivityType(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Jenis Aktivitas</option>
            <option value="mood">Pengisian Mood</option>
            <option value="exercise">Latihan Menenangkan Diri</option>
            <option value="journal">Jurnal Pemicu &amp; Pikiran</option>
            <option value="planner">Perencana Belajar</option>
            <option value="reflection">Refleksi Mingguan</option>
            <option value="help_request">Permintaan Bantuan (Metadata)</option>
          </Select>

          <Input
            label="Cari Kode Siswa"
            aria-label="Cari kode siswa"
            value={searchCode}
            onChange={(e) => {
              setSearchCode(e.target.value);
              setPage(1);
            }}
            placeholder="Cari kode siswa"
          />
        </div>

        {activitiesQuery.isLoading ? (
          <LoadingState message="Memuat metadata aktivitas..." />
        ) : activitiesQuery.isError ? (
          <ErrorState
            message={activitiesQuery.error.message}
            onRetry={() => activitiesQuery.refetch()}
          />
        ) : (activitiesQuery.data?.activities || []).length === 0 ? (
          <EmptyState
            title="Tidak ada metadata aktivitas yang cocok"
            description="Periksa filter kelompok, jenis aktivitas, atau kode siswa."
          />
        ) : (
          <>
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Kode Siswa</th>
                    <th>Kelompok</th>
                    <th>Aktivitas</th>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th>Metadata Durasi</th>
                  </tr>
                </thead>
                <tbody>
                  {activitiesQuery.data.activities.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-hover)' }}>
                        {row.studentCode}
                      </td>
                      <td>{row.gradeGroup}</td>
                      <td style={{ fontWeight: 600 }}>{row.activityLabel}</td>
                      <td className="muted-text">
                        {formatIndonesianDateTime(row.occurredAt, school?.timezone)}
                      </td>
                      <td>
                        <Badge tone="lime">{row.statusLabel}</Badge>
                      </td>
                      <td className="muted-text" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.durationSeconds ? formatSecondsMMSS(row.durationSeconds) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.paginationBar}>
              <span className="muted-text" style={{ fontSize: 'var(--text-sm)' }}>
                Halaman {page} dari {totalPages} ({pagination.total || 0} catatan metadata)
              </span>
              <div className="cluster">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="stack-md">
        <div className="cluster" style={{ justifyContent: 'space-between' }}>
          <div className="cluster">
            <Download size={18} color="var(--color-primary)" aria-hidden="true" />
            <h2 className="cardTitle">Unduh Ringkasan Agregat Kelompok (Verifikasi Sandi)</h2>
          </div>
          <Badge tone="neutral">Supresi k = 5 Tetap Berlaku</Badge>
        </div>
        <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
          File ekspor hanya memuat metrik agregat kelompok penugasan yang memenuhi batas privasi k =
          5. Kelompok kecil tetap disupresi dan tidak memuat catatan pribadi siswa.
        </p>
        <StatusNotice tone={exportNotice?.tone}>{exportNotice?.text}</StatusNotice>
        <div className={styles.exportRow}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input
              label="Konfirmasi kata sandi Guru BK"
              type="password"
              value={exportPassword}
              onChange={(e) => setExportPassword(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={exportLoading || !exportPassword}
            onClick={() => handleExportBkAggregate('json')}
          >
            Unduh Agregat JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={exportLoading || !exportPassword}
            onClick={() => handleExportBkAggregate('csv')}
          >
            Unduh Agregat CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}
