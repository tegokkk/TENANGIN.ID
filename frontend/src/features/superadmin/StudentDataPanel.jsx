import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { StudentRecordsManager } from './StudentRecordsManager.jsx';
import { apiRequest } from '../../lib/api-client.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import { LoadingState } from '../../components/states/LoadingState.jsx';
import { ErrorState } from '../../components/states/ErrorState.jsx';

export function StudentDataPanel() {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [notice, setNotice] = useState(null);

  const studentsQuery = useQuery({
    queryKey: ['superadmin', 'users', 'student-list'],
    queryFn: () => apiRequest('/superadmin/users?role=student'),
  });

  const dataQuery = useQuery({
    queryKey: ['superadmin', 'student-data', selectedStudentId],
    queryFn: () => apiRequest(`/superadmin/students/${selectedStudentId}/data`),
    enabled: Boolean(selectedStudentId),
  });

  const verifyGuardianMutation = useMutation({
    mutationFn: ({ studentId, verified }) =>
      apiRequest(`/superadmin/students/${studentId}/consents/guardian`, {
        method: 'PATCH',
        body: { guardianVerified: verified, guardianReference: 'Verifikasi Sekolah' },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'student-data', selectedStudentId],
      });
      setNotice({ tone: 'success', text: 'Status verifikasi wali diperbarui.' });
    },
  });

  const students = studentsQuery.data?.users || [];

  return (
    <div className="stack-md">
      <div className="infoStrip">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <ShieldAlert
            size={20}
            color="var(--color-primary)"
            aria-hidden="true"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div>
            <strong>Akses Data Pribadi Siswa (Teraudit Otomatis)</strong>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
              Isi jurnal dan refleksi hanya dibuka sesuai kebutuhan pengelolaan. Setiap pembacaan
              dan perubahan tercatat pada <strong>Log Audit</strong>.
            </p>
          </div>
        </div>
      </div>

      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>

      <Card className="stack-md">
        <Select
          id="selectStudentInspect"
          label="Pilih Akun Siswa untuk Inspeksi Data"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
        >
          <option value="">-- Pilih siswa --</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.accountCode} ({s.gradeGroup || '-'}) • {s.status}
            </option>
          ))}
        </Select>

        {!selectedStudentId ? (
          <p className="muted-text" style={{ margin: 0 }}>
            Pilih siswa untuk melihat data terdekripsi dan mencatat akses audit.
          </p>
        ) : dataQuery.isLoading ? (
          <LoadingState message="Memuat data siswa dan mencatat audit..." />
        ) : dataQuery.isError ? (
          <ErrorState message={dataQuery.error.message} onRetry={dataQuery.refetch} />
        ) : dataQuery.data ? (
          <div className="stack-md">
            <StatusNotice tone="info">{dataQuery.data.auditNotice}</StatusNotice>

            <div className="cluster">
              <span className="muted-text">
                Mood {dataQuery.data.moods.length} · Jurnal {dataQuery.data.journals.length} ·
                Refleksi {dataQuery.data.reflections.length} · Tugas {dataQuery.data.tasks.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  verifyGuardianMutation.mutate({
                    studentId: selectedStudentId,
                    verified: true,
                  })
                }
              >
                Tandai Persetujuan Wali Terverifikasi
              </Button>
            </div>

            <StudentRecordsManager key={selectedStudentId} studentId={selectedStudentId} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
