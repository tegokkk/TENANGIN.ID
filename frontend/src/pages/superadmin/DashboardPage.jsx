import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Database,
  LayoutDashboard,
  MessageCircleHeart,
  Settings,
  Users,
} from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDateTime } from '../../lib/date-format.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Disclosure } from '../../components/ui/Disclosure.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import { UsersAssignmentsPanel } from '../../features/superadmin/UsersAssignmentsPanel.jsx';
import { RegistrationsPanel } from '../../features/superadmin/RegistrationsPanel.jsx';
import { StudentDataPanel } from '../../features/superadmin/StudentDataPanel.jsx';
import { ContentPanel } from '../../features/superadmin/ContentPanel.jsx';
import { HelpFeedbackPanel } from '../../features/superadmin/HelpFeedbackPanel.jsx';
import { SettingsAuditPanel } from '../../features/superadmin/SettingsAuditPanel.jsx';
import styles from '../../features/superadmin/SuperadminPanels.module.css';

const SUPERADMIN_TABS = [
  {
    value: 'ringkasan',
    label: 'Ringkasan',
    icon: <LayoutDashboard size={16} aria-hidden="true" />,
  },
  { value: 'akun', label: 'Akun & Role', icon: <Users size={16} aria-hidden="true" /> },
  { value: 'data', label: 'Data Siswa', icon: <Database size={16} aria-hidden="true" /> },
  { value: 'konten', label: 'Konten', icon: <BookOpen size={16} aria-hidden="true" /> },
  {
    value: 'bantuan',
    label: 'Bantuan & Pesan',
    icon: <MessageCircleHeart size={16} aria-hidden="true" />,
  },
  {
    value: 'pengaturan',
    label: 'Pengaturan & Audit',
    icon: <Settings size={16} aria-hidden="true" />,
  },
];

export function SuperadminDashboardPage() {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get('halaman');
  const activeTab = SUPERADMIN_TABS.some((item) => item.value === requestedTab)
    ? requestedTab
    : 'ringkasan';
  const setActiveTab = (value) => setParams(value === 'ringkasan' ? {} : { halaman: value });

  const dashQuery = useQuery({
    queryKey: ['superadmin', 'dashboard'],
    queryFn: () => apiRequest('/superadmin/dashboard'),
  });

  const summary = dashQuery.data?.summary;

  return (
    <div className="stack-lg">
      <header className="pageHeader">
        <span className="muted-text">{dashQuery.data?.school?.name || 'TENANGIN.ID'}</span>
        <h1 className="pageTitle">
          {activeTab === 'ringkasan'
            ? 'Dashboard Superadmin'
            : SUPERADMIN_TABS.find((item) => item.value === activeTab)?.label}
        </h1>
      </header>
      <div className={styles.workspace}>
        <Tabs
          items={SUPERADMIN_TABS}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Panel kendali Superadmin"
          orientation="vertical"
          id="superadmin"
        />
        <div
          className="stack-lg"
          role="tabpanel"
          id={`superadmin-panel-${activeTab}`}
          aria-labelledby={`superadmin-tab-${activeTab}`}
          tabIndex={0}
        >
          {activeTab === 'ringkasan' && (
            <div className="stack-lg">
              {dashQuery.isLoading ? (
                <LoadingState message="Memuat ringkasan sistem..." />
              ) : dashQuery.isError ? (
                <ErrorState message={dashQuery.error.message} onRetry={() => dashQuery.refetch()} />
              ) : (
                <>
                  <dl className={styles.metrics}>
                    <div>
                      <dt>Siswa Terdaftar</dt>
                      <dd>{summary?.studentCount ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Guru BK</dt>
                      <dd>{summary?.bkCount ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Antrean Bantuan</dt>
                      <dd>{summary?.pendingHelpCount ?? 0}</dd>
                    </div>
                  </dl>
                  <RegistrationsPanel />
                  <Card className={styles.rowBetween}>
                    <div>
                      <h2 className="cardTitle">Permintaan Bantuan</h2>
                      <p className="muted-text" style={{ margin: '6px 0 0' }}>
                        {summary?.pendingHelpCount
                          ? `${summary.pendingHelpCount} permintaan perlu ditindaklanjuti.`
                          : 'Tidak ada permintaan yang menunggu.'}
                      </p>
                    </div>
                    <Button variant="secondary" onClick={() => setActiveTab('bantuan')}>
                      Kelola Bantuan
                    </Button>
                  </Card>
                  <Disclosure
                    title="Aktivitas & Audit Terbaru"
                    subtitle={`${summary?.activityEventsCount ?? 0} aktivitas terdata`}
                  >
                    <p className="muted-text">
                      Pembacaan data pribadi dan perubahan sistem tercatat pada log audit.
                    </p>
                    {(dashQuery.data?.recentAudits || []).length === 0 ? (
                      <p className="muted-text">Belum ada catatan audit.</p>
                    ) : (
                      dashQuery.data.recentAudits.slice(0, 5).map((event) => (
                        <div key={event.id} className={styles.auditRow}>
                          <div>
                            <strong>{event.actorCode || event.actorRole}</strong>
                            <p className="muted-text" style={{ margin: '4px 0' }}>
                              {event.summary}
                            </p>
                            <span className="muted-text">{event.action}</span>
                          </div>
                          <time className="muted-text">
                            {formatIndonesianDateTime(event.createdAt)}
                          </time>
                        </div>
                      ))
                    )}
                    <Button variant="ghost" onClick={() => setActiveTab('pengaturan')}>
                      Lihat Audit Lengkap
                    </Button>
                  </Disclosure>
                </>
              )}
            </div>
          )}

          {activeTab === 'akun' && <UsersAssignmentsPanel />}
          {activeTab === 'data' && <StudentDataPanel />}
          {activeTab === 'konten' && <ContentPanel />}
          {activeTab === 'bantuan' && <HelpFeedbackPanel />}
          {activeTab === 'pengaturan' && <SettingsAuditPanel />}
        </div>
      </div>
    </div>
  );
}
