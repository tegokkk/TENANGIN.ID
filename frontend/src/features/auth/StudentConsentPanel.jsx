import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api-client.js';
import { useAuth } from './AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import styles from './StudentConsentPanel.module.css';
import { hasPersonalAccess } from './personal-access.js';

export function StudentConsentPanel({ welcome = false }) {
  const { user, consentStatus, refreshSession } = useAuth();
  const [checkedVersion, setCheckedVersion] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const version = consentStatus?.activePolicyVersion;
  const canUsePersonalFeatures = hasPersonalAccess(consentStatus);
  const accountApprovalMode = consentStatus?.accessMode === 'account_approval';
  const policyQuery = useQuery({
    queryKey: ['consent-policy', user?.schoolId, version],
    queryFn: () => apiRequest('/consent-policy'),
    enabled: Boolean(version) && !canUsePersonalFeatures && !accountApprovalMode,
    retry: 1,
  });
  const policy = policyQuery.data?.policy;
  const policyUnavailable = !version || (policyQuery.isSuccess && !policy);
  const awaitingGuardian = consentStatus?.status === 'accepted' && !consentStatus?.guardianVerified;
  const Heading = welcome ? 'h2' : 'h1';

  async function resumeAccess() {
    setSubmitting(true);
    setNotice(null);
    try {
      await apiRequest('/consents/resume', { method: 'POST', body: {} });
      await refreshSession();
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function checkStatus() {
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await refreshSession();
      if (result.isError) throw result.error;
    } catch (err) {
      setNotice({ tone: 'error', text: err.message || 'Status belum berhasil diperiksa.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDecision(decision) {
    if (!policy || (decision === 'accepted' && checkedVersion !== policy.version)) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await apiRequest('/consents', {
        method: 'POST',
        body: { policyVersion: policy.version, decision },
      });
      setCheckedVersion(null);
      setNotice({
        tone: decision === 'accepted' ? 'success' : 'info',
        text:
          decision === 'accepted'
            ? 'Persetujuan tersimpan.'
            : 'Pilihan tersimpan. Pustaka dan Bantuan tetap bisa diakses.',
      });
      await refreshSession();
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
      if (err.code === 'POLICY_VERSION_OUTDATED') {
        setCheckedVersion(null);
        await Promise.all([policyQuery.refetch(), refreshSession()]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-lg">
      {welcome && (
        <Card tone="lime" className="stack-md">
          <h1 className="pageTitle">Selamat datang, {user?.displayName || user?.accountCode}.</h1>
          <p className="muted-text" style={{ margin: 0 }}>
            Akunmu aktif. Jelajahi latihan dan bacaan di Pustaka.
          </p>
          <div className="cluster">
            <Link to="/app/pustaka" className="btnLinkPrimary">
              Buka Pustaka
            </Link>
            <Link to="/app/bantuan" className="btnLink">
              Bantuan
            </Link>
          </div>
        </Card>
      )}
      <Card className={`stack-md ${styles.panel}`}>
        <Heading className={welcome ? 'cardTitle' : 'pageTitle'}>
          {canUsePersonalFeatures ? 'Fitur Pribadi Aktif' : 'Fitur Pribadi'}
        </Heading>
        <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>
        {canUsePersonalFeatures ? (
          <>
            <p className="muted-text" style={{ margin: 0 }}>
              Kamu bisa menggunakan fitur pribadi.
            </p>
            <div>
              <Link to="/app" className="btnLinkPrimary">
                Kembali ke Beranda
              </Link>
            </div>
          </>
        ) : accountApprovalMode && consentStatus?.paused ? (
          <>
            <p className="muted-text prose" style={{ margin: 0 }}>
              Pencatatan aktivitas sedang dijeda melalui pengaturan akunmu. Aktifkan kembali untuk
              menggunakan cek mood, catatan, dan refleksi.
            </p>
            <div>
              <Button disabled={submitting} onClick={resumeAccess}>
                {submitting ? 'Mengaktifkan...' : 'Aktifkan Kembali'}
              </Button>
            </div>
          </>
        ) : policyUnavailable ? (
          <p className="muted-text prose" style={{ margin: 0 }}>
            Pengelola belum menyiapkan kebijakan data. Cek mood, catatan, dan refleksi akan tersedia
            setelah kebijakan siap dan persetujuan diberikan. Pustaka dan Bantuan tetap bisa
            diakses.
          </p>
        ) : awaitingGuardian ? (
          <p className="muted-text prose" style={{ margin: 0 }}>
            Persetujuanmu sudah tersimpan. Fitur pribadi menunggu konfirmasi persetujuan wali oleh
            pengelola. Pustaka dan Bantuan tetap bisa diakses.
          </p>
        ) : policyQuery.isPending ? (
          <p className="muted-text">Memuat kebijakan data...</p>
        ) : policyQuery.isError ? (
          <>
            <StatusNotice tone="error">
              Kebijakan belum berhasil dimuat. Silakan coba lagi.
            </StatusNotice>
            <div>
              <Button onClick={() => policyQuery.refetch()}>Coba Lagi</Button>
            </div>
          </>
        ) : policy ? (
          <>
            <p className="muted-text prose" style={{ margin: 0 }}>
              Baca kebijakan berikut sebelum menggunakan cek mood, catatan, dan refleksi.
            </p>
            <div
              className={styles.policy}
              tabIndex={0}
              role="region"
              aria-label="Kebijakan data siswa"
            >
              <strong>
                {policy.title} (v{policy.version})
              </strong>
              <p>{policy.summary}</p>
              <p>{policy.fullPolicyText}</p>
              {policy.dataAccessNotice && <p>{policy.dataAccessNotice}</p>}
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={checkedVersion === policy.version}
                onChange={(e) => setCheckedVersion(e.target.checked ? policy.version : null)}
                disabled={submitting}
              />
              <span>Saya telah membaca kebijakan data dan setuju secara sukarela.</span>
            </label>
            <div className="cluster">
              <Button
                disabled={submitting || checkedVersion !== policy.version}
                onClick={() => saveDecision('accepted')}
              >
                {submitting ? 'Menyimpan...' : 'Setujui Kebijakan Data'}
              </Button>
              <Button
                variant="ghost"
                disabled={submitting}
                onClick={() => saveDecision('declined')}
              >
                Tolak
              </Button>
            </div>
          </>
        ) : null}
        {!welcome && !canUsePersonalFeatures && (
          <div className="cluster">
            <Link to="/app/pustaka" className="btnLink">
              Buka Pustaka
            </Link>
            <Link to="/app/bantuan" className="btnLink">
              Bantuan
            </Link>
          </div>
        )}
        {!canUsePersonalFeatures &&
          !accountApprovalMode &&
          (policyUnavailable || awaitingGuardian) && (
            <div>
              <Button variant="ghost" disabled={submitting} onClick={checkStatus}>
                {submitting ? 'Memeriksa...' : 'Periksa Status'}
              </Button>
            </div>
          )}
      </Card>
    </div>
  );
}
