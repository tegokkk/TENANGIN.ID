import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserPlus } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import styles from './SuperadminPanels.module.css';
import { ActionMenu } from '../../components/ui/ActionMenu.jsx';

const ROLE_LABELS = {
  student: 'Siswa',
  bk: 'Guru BK',
  superadmin: 'Superadmin',
};

const STATUS_LABELS = {
  active: 'Aktif',
  pending_activation: 'Menunggu Persetujuan',
  inactive: 'Nonaktif',
};

export function UsersAssignmentsPanel() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [notice, setNotice] = useState(null);
  const [issuedTokenInfo, setIssuedTokenInfo] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState(null);
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const [accountCode, setAccountCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nisn, setNisn] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [role, setRole] = useState('student');
  const [gradeGroup, setGradeGroup] = useState('Kelas X');

  const [assignCounselorId, setAssignCounselorId] = useState('');
  const [assignGroup, setAssignGroup] = useState('Kelas XI');
  const [assignPeriod, setAssignPeriod] = useState('Semester Ganjil 2026/2027');

  const usersQuery = useQuery({
    queryKey: ['superadmin', 'users', roleFilter, searchQ],
    queryFn: () => {
      const p = new URLSearchParams();
      if (roleFilter) p.set('role', roleFilter);
      if (searchQ.trim()) p.set('q', searchQ.trim());
      return apiRequest(`/superadmin/users?${p.toString()}`);
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ['superadmin', 'assignments'],
    queryFn: () => apiRequest('/superadmin/assignments'),
  });

  const counselorsQuery = useQuery({
    queryKey: ['superadmin', 'users', 'assignment-counselors'],
    queryFn: () => apiRequest('/superadmin/users?role=bk'),
    enabled: assignOpen,
  });

  const createUserMutation = useMutation({
    mutationFn: (payload) => apiRequest('/superadmin/users', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'dashboard'] });
      setAccountCode('');
      setDisplayName('');
      setLoginEmail('');
      setNisn('');
      setInitialPassword('');
      setCreateOpen(false);
      setNotice({ tone: 'success', text: 'Akun dibuat dan diaktifkan oleh Superadmin.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const patchUserMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      apiRequest(`/superadmin/users/${id}`, { method: 'PATCH', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      setEditingUser(null);
      setConfirmToggleUser(null);
      setNotice({ tone: 'success', text: 'Akun diperbarui dan dicatat di audit.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const recoveryTokenMutation = useMutation({
    mutationFn: (id) =>
      apiRequest(`/superadmin/users/${id}/recovery-token`, { method: 'POST', body: {} }),
    onSuccess: (res) => {
      setIssuedTokenInfo({
        title: `Token Pemulihan Sekali Pakai (${res.accountCode})`,
        token: res.recoveryTokenOnce,
      });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest('/superadmin/assignments', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'assignments'] });
      setAssignOpen(false);
      setNotice({ tone: 'success', text: 'Penugasan Guru BK disimpan.' });
    },
    onError: (err) => setNotice({ tone: 'error', text: err.message }),
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => apiRequest(`/superadmin/assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'assignments'] });
      setConfirmDeleteAssignment(null);
      setNotice({ tone: 'info', text: 'Penugasan Guru BK dihapus.' });
    },
  });

  const users = usersQuery.data?.users || [];
  const bkUsers = counselorsQuery.data?.users || [];

  return (
    <div className="stack-lg">
      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>

      {issuedTokenInfo && (
        <Card tone="lime" className="stack-sm">
          <strong>{issuedTokenInfo.title}</strong>
          <code className="mono-text" style={{ fontSize: '1rem', fontWeight: 800 }}>
            {issuedTokenInfo.token}
          </code>
          <span style={{ fontSize: 'var(--text-sm)' }}>
            Salin sekarang untuk distribusi melalui prosedur sekolah (tidak ditampilkan lagi setelah
            ditutup).
          </span>
          <div>
            <Button variant="ghost" size="sm" onClick={() => setIssuedTokenInfo(null)}>
              Tutup
            </Button>
          </div>
        </Card>
      )}

      <Card className="stack-md">
        <div className={styles.rowBetween}>
          <div>
            <h2 className="cardTitle">Daftar Akun Pengguna</h2>
            <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
              Kelola akun siswa, Guru BK, dan Superadmin sekolah.
            </p>
          </div>
          <div className="cluster">
            <Badge tone="neutral">{users.length} Akun</Badge>
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus size={16} aria-hidden="true" />
              <span>Buat Akun Baru</span>
            </Button>
          </div>
        </div>

        <div className={styles.twoColActionRow} style={{ alignItems: 'flex-end', gap: 12 }}>
          <div className="cluster" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Input
                label="Cari Kode Akun / Nama"
                placeholder="Cari kode akun..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
            <div style={{ width: 170 }}>
              <Select
                label="Filter Role"
                aria-label="Filter role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Semua Role</option>
                <option value="student">Siswa</option>
                <option value="bk">Guru BK</option>
                <option value="superadmin">Superadmin</option>
              </Select>
            </div>
          </div>
        </div>

        {usersQuery.isLoading ? (
          <LoadingState />
        ) : (
          <div className="tableWrap">
            <table className={`dataTable ${styles.accountsTable}`}>
              <thead>
                <tr>
                  <th>Nama / Identitas</th>
                  <th>Role</th>
                  <th>Kelompok</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.displayName}</strong>
                      <div className="muted-text">{u.nisn || u.accountCode}</div>
                    </td>
                    <td>
                      <span>{ROLE_LABELS[u.role] || u.role}</span>
                    </td>
                    <td>{u.gradeGroup || '-'}</td>
                    <td>
                      <Badge tone={u.status === 'active' ? 'success' : 'warning'}>
                        {STATUS_LABELS[u.status] || u.status}
                      </Badge>
                    </td>
                    <td>
                      {u.registrationStatus === 'pending' ? (
                        <span className="muted-text">Tinjau di Ringkasan → Pendaftaran Siswa.</span>
                      ) : u.registrationStatus === 'rejected' ? (
                        <Badge tone="danger">Pendaftaran Ditolak</Badge>
                      ) : (
                        <div className={styles.tableActions}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingUser({ ...u })}
                          >
                            Edit Akun
                          </Button>
                          <ActionMenu
                            label="Lainnya"
                            items={[
                              {
                                label: 'Token Pulih',
                                onClick: () => recoveryTokenMutation.mutate(u.id),
                                disabled: recoveryTokenMutation.isPending,
                              },
                              {
                                label: u.status === 'inactive' ? 'Aktifkan' : 'Nonaktifkan',
                                tone: u.status === 'inactive' ? undefined : 'danger',
                                onClick: () =>
                                  u.status === 'inactive'
                                    ? patchUserMutation.mutate({
                                        id: u.id,
                                        payload: { status: 'active' },
                                      })
                                    : setConfirmToggleUser(u),
                              },
                            ]}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="stack-md">
        <div className={styles.rowBetween}>
          <div>
            <h2 className="cardTitle">Penugasan Pemantauan Guru BK</h2>
            <p className="muted-text" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
              Tentukan kelompok siswa yang dipantau setiap Guru BK.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setAssignOpen(true)}>
            <Plus size={15} aria-hidden="true" />
            <span>Tambah Penugasan</span>
          </Button>
        </div>

        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Guru BK</th>
                <th>Kelompok Siswa</th>
                <th>Periode</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(assignmentsQuery.data?.assignments || []).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="muted-text"
                    style={{ textAlign: 'center', padding: 24 }}
                  >
                    Belum ada penugasan Guru BK.
                  </td>
                </tr>
              ) : (
                (assignmentsQuery.data?.assignments || []).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.counselorCode}</strong>
                    </td>
                    <td>
                      <span>{a.gradeGroup}</span>
                    </td>
                    <td>{a.periodLabel}</td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmDeleteAssignment(a)}
                      >
                        Hapus
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit Akun dan Role"
      >
        {editingUser && (
          <form
            className="stack-md"
            onSubmit={(event) => {
              event.preventDefault();
              patchUserMutation.mutate({
                id: editingUser.id,
                payload: {
                  displayName: editingUser.displayName,
                  role: editingUser.role,
                  gradeGroup: editingUser.gradeGroup || null,
                  loginEmail: editingUser.loginEmail || null,
                },
              });
            }}
          >
            <Input
              label="Nama Tampilan Akun"
              value={editingUser.displayName}
              onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
              required
              minLength={2}
            />
            <Input
              label="Email Login Akun"
              type="email"
              value={editingUser.loginEmail || ''}
              onChange={(e) => setEditingUser({ ...editingUser, loginEmail: e.target.value })}
            />
            <Select
              label="Role Akun"
              value={editingUser.role}
              onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
            >
              <option value="student">Siswa</option>
              <option value="bk">Guru BK</option>
              <option value="superadmin">Superadmin</option>
            </Select>
            <Input
              label="Kelompok Akun"
              value={editingUser.gradeGroup || ''}
              onChange={(e) => setEditingUser({ ...editingUser, gradeGroup: e.target.value })}
            />
            <StatusNotice tone="error">{patchUserMutation.error?.message}</StatusNotice>
            <div className="cluster" style={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setEditingUser(null)}>
                Batal
              </Button>
              <Button type="submit" disabled={patchUserMutation.isPending}>
                Simpan Akun
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog
        open={Boolean(confirmToggleUser)}
        onClose={() => setConfirmToggleUser(null)}
        title="Nonaktifkan Akun Pengguna?"
        description={
          confirmToggleUser
            ? `Akun ${confirmToggleUser.accountCode} tidak akan dapat masuk sampai diaktifkan kembali. Perubahan ini tercatat pada log audit.`
            : null
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmToggleUser(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={patchUserMutation.isPending}
              onClick={() =>
                confirmToggleUser &&
                patchUserMutation.mutate({
                  id: confirmToggleUser.id,
                  payload: { status: 'inactive' },
                })
              }
            >
              {patchUserMutation.isPending ? 'Memproses...' : 'Ya, Nonaktifkan'}
            </Button>
          </>
        }
      >
        <StatusNotice tone="error">{patchUserMutation.error?.message}</StatusNotice>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeleteAssignment)}
        onClose={() => setConfirmDeleteAssignment(null)}
        title="Hapus Penugasan Guru BK?"
        description={
          confirmDeleteAssignment
            ? `Cakupan pemantauan ${confirmDeleteAssignment.counselorCode} untuk kelompok ${confirmDeleteAssignment.gradeGroup} akan dihapus.`
            : null
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDeleteAssignment(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={deleteAssignmentMutation.isPending}
              onClick={() =>
                confirmDeleteAssignment &&
                deleteAssignmentMutation.mutate(confirmDeleteAssignment.id)
              }
            >
              {deleteAssignmentMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Penugasan'}
            </Button>
          </>
        }
      >
        <StatusNotice tone="error">{deleteAssignmentMutation.error?.message}</StatusNotice>
      </Dialog>

      {/* Dialog Buat Akun Baru */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Akun Pengguna Baru"
        size="lg"
      >
        <StatusNotice tone="error">{createUserMutation.error?.message}</StatusNotice>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createUserMutation.mutate({
              accountCode,
              displayName,
              nisn: role === 'student' ? nisn : null,
              password: initialPassword,
              loginEmail: loginEmail.trim() || null,
              role,
              gradeGroup: role === 'student' ? gradeGroup : null,
            });
          }}
          className={styles.formGrid3}
        >
          <Input
            label="Kode Akun"
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
            placeholder="Kode akun pengguna"
            required
          />
          <Input
            label="Nama Tampilan"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nama atau alias"
            required
          />
          <Input
            label={role === 'student' ? 'Email Login (opsional)' : 'Email Login'}
            type="email"
            required={role !== 'student'}
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Email akun staf"
          />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Siswa</option>
            <option value="bk">Guru BK</option>
            <option value="superadmin">Superadmin</option>
          </Select>
          {role === 'student' && (
            <Input
              label="Kelompok Kelas"
              value={gradeGroup}
              onChange={(e) => setGradeGroup(e.target.value)}
              placeholder="Kelas X / Kelas XI"
            />
          )}
          {role === 'student' && (
            <Input
              label="NISN Siswa"
              value={nisn}
              onChange={(e) => setNisn(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              required
            />
          )}
          <Input
            label="Sandi Awal Akun"
            type="password"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <div
            className="cluster"
            style={{ gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: 8 }}
          >
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={createUserMutation.isPending}>
              <Plus size={16} aria-hidden="true" />
              <span>{createUserMutation.isPending ? 'Membuat...' : 'Buat Akun'}</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Dialog Penugasan Guru BK */}
      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Tambah Penugasan Guru BK"
        size="md"
      >
        <StatusNotice tone="error">{createAssignmentMutation.error?.message}</StatusNotice>
        {counselorsQuery.isLoading ? (
          <LoadingState message="Memuat pilihan Guru BK..." />
        ) : counselorsQuery.isError ? (
          <ErrorState
            message={counselorsQuery.error.message}
            onRetry={() => counselorsQuery.refetch()}
          />
        ) : bkUsers.length === 0 ? (
          <p className="muted-text">
            Belum ada akun Guru BK. Buat akun Guru BK melalui menu Akun &amp; Role terlebih dahulu.
          </p>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const targetId = assignCounselorId || bkUsers[0]?.id;
            if (!targetId) return;
            createAssignmentMutation.mutate({
              counselorUserId: targetId,
              gradeGroup: assignGroup,
              periodLabel: assignPeriod,
              isActive: true,
            });
          }}
          className="stack-md"
        >
          <Select
            label="Pilih Guru BK"
            required
            aria-label="Pilih Guru BK"
            value={assignCounselorId || bkUsers[0]?.id || ''}
            onChange={(e) => setAssignCounselorId(e.target.value)}
          >
            {bkUsers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.accountCode} — {b.displayName}
              </option>
            ))}
          </Select>
          <Input
            label="Kelompok Penugasan"
            aria-label="Kelompok Penugasan"
            value={assignGroup}
            onChange={(e) => setAssignGroup(e.target.value)}
            placeholder="Kelas X / Kelas XI / Semua Siswa"
            required
          />
          <Input
            label="Periode Penugasan"
            aria-label="Periode Penugasan"
            value={assignPeriod}
            onChange={(e) => setAssignPeriod(e.target.value)}
            required
          />
          <div className="cluster" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={createAssignmentMutation.isPending || bkUsers.length === 0}
            >
              {createAssignmentMutation.isPending ? 'Menyimpan...' : 'Simpan Penugasan'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
