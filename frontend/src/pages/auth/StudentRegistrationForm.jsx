import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client.js';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';

export function StudentRegistrationForm({ onBack }) {
  const [displayName, setDisplayName] = useState('');
  const [nisn, setNisn] = useState('');
  const [gradeGroup, setGradeGroup] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const config = useQuery({
    queryKey: ['public', 'config'],
    queryFn: () => apiRequest('/public/config'),
  });
  const schools = config.data?.schools || [];

  async function submit(event) {
    event.preventDefault();
    if (password !== confirmation) {
      setNotice({ tone: 'error', text: 'Konfirmasi sandi belum sama.' });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const selected = schools.length === 1 ? schools[0].code : schoolCode;
      const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: {
          displayName,
          nisn,
          gradeGroup,
          password,
          ...(selected ? { schoolCode: selected } : {}),
        },
      });
      setNotice({ tone: 'success', text: result.message });
      setPassword('');
      setConfirmation('');
      setSubmitted(true);
    } catch (error) {
      setNotice({ tone: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-md">
      <p className="muted-text" style={{ margin: 0 }}>
        Isi data akunmu. Superadmin akan meninjau pendaftaran sebelum akun dapat digunakan.
      </p>
      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>
      {submitted ? (
        <Button fullWidth onClick={() => onBack(nisn)}>
          Kembali ke Masuk
        </Button>
      ) : (
        <form onSubmit={submit} className="stack-md">
          <Input
            label="Nama Lengkap"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
          <Input
            label="NISN"
            value={nisn}
            onChange={(e) => setNisn(e.target.value)}
            inputMode="numeric"
            autoComplete="username"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="10 digit NISN"
            required
          />
          <Input
            label="Kelas"
            value={gradeGroup}
            onChange={(e) => setGradeGroup(e.target.value)}
            maxLength={64}
            placeholder="Kelas atau rombongan belajar"
            required
          />
          {schools.length > 1 && (
            <Select
              label="Ruang Layanan"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              required
            >
              <option value="">Pilih ruang layanan</option>
              {schools.map((school) => (
                <option key={school.code} value={school.code}>
                  {school.name}
                </option>
              ))}
            </Select>
          )}
          <Input
            label="Kata Sandi Pendaftaran"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            helperText="Minimal 8 karakter."
            required
          />
          <Input
            label="Konfirmasi Kata Sandi"
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <Button type="submit" fullWidth disabled={submitting || config.isLoading}>
            {submitting ? 'Mengirim...' : 'Daftar Akun'}
          </Button>
          <Button variant="ghost" fullWidth onClick={() => onBack()}>
            Sudah punya akun? Masuk
          </Button>
        </form>
      )}
    </div>
  );
}
