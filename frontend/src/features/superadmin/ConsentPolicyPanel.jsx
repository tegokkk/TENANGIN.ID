import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Dialog } from '../../components/ui/Dialog.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';

const EMPTY_POLICY = {
  version: '',
  title: '',
  summary: '',
  fullPolicyText: '',
  dataAccessNotice: '',
};

export function ConsentPolicyPanel({ policies = [], loading = false, error = null }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(EMPTY_POLICY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const activePolicy = policies.find((policy) => policy.is_active);
  const publish = useMutation({
    mutationFn: (body) =>
      apiRequest('/superadmin/settings/consent-policies', { method: 'POST', body }),
    onSuccess: async () => {
      setConfirmOpen(false);
      setDraft(EMPTY_POLICY);
      setNotice({
        tone: 'success',
        text: 'Kebijakan diterbitkan. Siswa dapat memberikan persetujuan dari akunnya.',
      });
      await queryClient.invalidateQueries({ queryKey: ['superadmin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'audit'] });
    },
    onError: (err) => {
      setConfirmOpen(false);
      setNotice({ tone: 'error', text: err.message });
    },
  });
  const update = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));

  return (
    <Card className="stack-md">
      <h2 className="cardTitle">Kebijakan Data Siswa</h2>
      <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>
      {loading ? (
        <p className="muted-text">Memuat kebijakan...</p>
      ) : error ? (
        <StatusNotice tone="error">Status kebijakan belum berhasil dimuat.</StatusNotice>
      ) : (
        <>
          <p className="muted-text prose" style={{ margin: 0 }}>
            {activePolicy
              ? `Kebijakan aktif: ${activePolicy.title} (v${activePolicy.version}).`
              : 'Belum ada kebijakan aktif. Siswa yang disetujui tetap bisa masuk; fitur pribadi menunggu kebijakan dan persetujuan.'}
          </p>
          <details>
            <summary>{activePolicy ? 'Terbitkan Versi Baru' : 'Siapkan Kebijakan Data'}</summary>
            <form
              className="stack-md"
              style={{ marginTop: 16 }}
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmOpen(true);
              }}
            >
              <Input
                label="Versi Kebijakan"
                value={draft.version}
                onChange={update('version')}
                required
                maxLength={32}
              />
              <Input
                label="Judul Kebijakan"
                value={draft.title}
                onChange={update('title')}
                required
                minLength={3}
                maxLength={200}
              />
              <Textarea
                label="Ringkasan Kebijakan"
                value={draft.summary}
                onChange={update('summary')}
                required
                minLength={10}
                maxLength={1000}
              />
              <Textarea
                label="Isi Kebijakan Data"
                value={draft.fullPolicyText}
                onChange={update('fullPolicyText')}
                required
                minLength={20}
                maxLength={10000}
                rows={7}
              />
              <Textarea
                label="Informasi Akses Data"
                value={draft.dataAccessNotice}
                onChange={update('dataAccessNotice')}
                required
                minLength={5}
                maxLength={300}
              />
              <p className="muted-text prose" style={{ margin: 0 }}>
                Gunakan kebijakan yang telah ditinjau sekolah. Persetujuan siswa dicatat terpisah
                dari persetujuan pendaftaran akun.
              </p>
              <div>
                <Button type="submit" disabled={publish.isPending}>
                  Tinjau Penerbitan
                </Button>
              </div>
            </form>
          </details>
        </>
      )}
      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!publish.isPending) setConfirmOpen(false);
        }}
        title="Terbitkan Kebijakan Data"
        description={`Terbitkan ${draft.title} (v${draft.version})? Versi ini berlaku untuk seluruh siswa di sekolah ini. Siswa perlu menyetujui versi baru sebelum memakai fitur pribadi.`}
        actions={
          <>
            <Button
              variant="ghost"
              disabled={publish.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              Batal
            </Button>
            <Button disabled={publish.isPending} onClick={() => publish.mutate(draft)}>
              {publish.isPending ? 'Menerbitkan...' : 'Terbitkan Kebijakan'}
            </Button>
          </>
        }
      />
    </Card>
  );
}
