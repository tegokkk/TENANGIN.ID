import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, UserCheck } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { formatIndonesianDateTime } from '../../lib/date-format.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';
import styles from './SuperadminPanels.module.css';

export function RegistrationsPanel() {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [notice, setNotice] = useState(null);
  const query = useQuery({
    queryKey: ['superadmin', 'registrations', page],
    queryFn: () => apiRequest(`/superadmin/registrations?page=${page}`),
    refetchInterval: 15000,
  });
  const mutation = useMutation({
    mutationFn: ({ user, decision }) =>
      apiRequest(`/superadmin/users/${user.id}/registration-review`, {
        method: 'POST',
        body: { decision },
      }),
    onSuccess: (result) => {
      setTarget(null);
      setNotice({ tone: 'success', text: result.message });
      client.invalidateQueries({ queryKey: ['superadmin'] });
      if (query.data?.registrations.length === 1 && page > 1) setPage(page - 1);
    },
    onError: (error) => {
      setTarget(null);
      setNotice({ tone: 'error', text: error.message });
      client.invalidateQueries({ queryKey: ['superadmin', 'registrations'] });
    },
  });
  const rows = query.data?.registrations || [];
  return (
    <Card className="stack-md">
      <div className={styles.rowBetween}>
        <div className="cluster">
          <UserCheck size={20} aria-hidden="true" />
          <h2 className="cardTitle">Pendaftaran Siswa</h2>
        </div>
        <Badge tone={query.data?.total ? 'warning' : 'neutral'}>
          {query.data?.total || 0} Menunggu Persetujuan
        </Badge>
      </div>
      {rows.length > 0 && (
        <p className="muted-text" style={{ margin: 0 }}>
          Periksa nama, NISN, dan kelas sebelum mengaktifkan akun.
        </p>
      )}
      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : !rows.length ? (
        <p className="muted-text" style={{ margin: 0 }}>
          Tidak ada pendaftaran menunggu.
        </p>
      ) : (
        <>
          <div className={`tableWrap ${styles.registrationTable}`}>
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th>NISN</th>
                  <th>Kelas</th>
                  <th>Diajukan</th>
                  <th>Persetujuan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id}>
                    <td>{user.displayName}</td>
                    <td className="mono-text" style={{ whiteSpace: 'nowrap' }}>
                      {user.nisn}
                    </td>
                    <td>{user.gradeGroup}</td>
                    <td>{formatIndonesianDateTime(user.submittedAt)}</td>
                    <td>
                      <div className="cluster">
                        <Button
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() => setTarget({ user, decision: 'approve' })}
                        >
                          <Check size={16} aria-hidden="true" />
                          Setujui &amp; Aktifkan
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={mutation.isPending}
                          onClick={() => setTarget({ user, decision: 'reject' })}
                        >
                          Tolak
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.registrationCards}>
            {rows.map((user) => (
              <article key={user.id} className={styles.recordCard}>
                <strong>{user.displayName}</strong>
                <dl>
                  <div>
                    <dt>NISN</dt>
                    <dd className="mono-text">{user.nisn}</dd>
                  </div>
                  <div>
                    <dt>Kelas</dt>
                    <dd>{user.gradeGroup}</dd>
                  </div>
                </dl>
                <span className="muted-text">{formatIndonesianDateTime(user.submittedAt)}</span>
                <div className={styles.registrationActions}>
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() => setTarget({ user, decision: 'approve' })}
                  >
                    Setujui &amp; Aktifkan
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={mutation.isPending}
                    onClick={() => setTarget({ user, decision: 'reject' })}
                  >
                    Tolak
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.paginationBar}>
            <span className="muted-text">Halaman {page}</span>
            <div className="cluster">
              <Button
                size="sm"
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={page * query.data.perPage >= query.data.total}
                onClick={() => setPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}
      <Dialog
        open={Boolean(target)}
        onClose={() => {
          if (!mutation.isPending) setTarget(null);
        }}
        title={
          target?.decision === 'approve' ? 'Setujui Pendaftaran Siswa' : 'Tolak Pendaftaran Siswa'
        }
        actions={
          <>
            <Button variant="ghost" disabled={mutation.isPending} onClick={() => setTarget(null)}>
              Batal
            </Button>
            <Button
              variant={target?.decision === 'approve' ? 'primary' : 'danger'}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(target)}
            >
              {mutation.isPending
                ? 'Menyimpan...'
                : target?.decision === 'approve'
                  ? 'Konfirmasi Persetujuan'
                  : 'Konfirmasi Penolakan'}
            </Button>
          </>
        }
      >
        {target && (
          <p style={{ margin: 0 }}>
            {target.user.displayName} · NISN {target.user.nisn} · {target.user.gradeGroup}.{' '}
            {target.decision === 'approve'
              ? 'Akun akan diaktifkan agar siswa dapat masuk dengan sandi yang didaftarkan.'
              : 'Akun tetap tidak dapat digunakan untuk masuk.'}
          </p>
        )}
      </Dialog>
    </Card>
  );
}
