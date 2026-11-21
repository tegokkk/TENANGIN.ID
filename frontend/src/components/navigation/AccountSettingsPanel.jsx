import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Download, LogOut, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { apiRequest } from '../../lib/api-client.js';
import { triggerBlobDownload } from '../../lib/pwa.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { hasPersonalAccess } from '../../features/auth/personal-access.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Badge } from '../ui/Badge.jsx';
import { StatusNotice } from '../ui/Toast.jsx';
import { useModalFocus } from '../ui/use-modal-focus.js';
import { Disclosure } from '../ui/Disclosure.jsx';
import styles from './AccountSettingsPanel.module.css';

const ROLE_LABELS = {
  student: 'Siswa',
  bk: 'Guru BK',
  superadmin: 'Superadmin',
};

export function AccountSettingsPanel({ open, onClose }) {
  const { user, school, consentStatus, logout, refreshSession } = useAuth();
  const accountApprovalMode = consentStatus?.accessMode === 'account_approval';
  const canUsePersonalFeatures = hasPersonalAccess(consentStatus);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwStatus, setPwStatus] = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [privacyAction, setPrivacyAction] = useState(null); // 'withdraw' | 'entries' | 'account' | 'export'
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privacyNotice, setPrivacyNotice] = useState(null);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const drawerRef = useRef(null);

  useModalFocus(drawerRef, open, onClose);

  if (!open || !user) return null;

  async function handleExportPersonal(format) {
    setPrivacyLoading(true);
    setPrivacyNotice(null);
    try {
      const res = await apiRequest('/exports/personal', {
        method: 'POST',
        body: { currentPassword: confirmPassword, format },
        responseType: format === 'csv' ? 'text' : 'json',
      });
      setConfirmPassword('');
      triggerBlobDownload({
        filename: `tenangin-ekspor-pribadi-${user.accountCode}.${format}`,
        content: format === 'csv' ? res : JSON.stringify(res, null, 2),
        mimeType: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
      });
      setPrivacyNotice({
        tone: 'success',
        text: `Ekspor data pribadimu (${format.toUpperCase()}) berhasil dibuat dan tidak disimpan di cache browser.`,
      });
      setPrivacyAction(null);
    } catch (err) {
      setPrivacyNotice({ tone: 'error', text: err.message });
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPwLoading(true);
    setPwStatus(null);
    try {
      const res = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      setCurrentPassword('');
      setNewPassword('');
      setPwStatus({ tone: 'success', text: res.message || 'Kata sandi diperbarui.' });
    } catch (err) {
      setPwStatus({ tone: 'error', text: err.message });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleWithdrawConsent() {
    setPrivacyLoading(true);
    setPrivacyNotice(null);
    try {
      await apiRequest('/consents/withdraw', { method: 'POST', body: {} });
      await refreshSession();
      queryClient.clear();
      setPrivacyNotice({
        tone: 'info',
        text: 'Pencatatan aktivitas dan pengingat dihentikan.',
      });
      setPrivacyAction(null);
      onClose?.();
      navigate('/app/persetujuan');
    } catch (err) {
      setPrivacyNotice({ tone: 'error', text: err.message });
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function handleDeletionSubmit(e) {
    e.preventDefault();
    setPrivacyLoading(true);
    setPrivacyNotice(null);
    try {
      const res = await apiRequest('/me/deletion-request', {
        method: 'POST',
        body: {
          currentPassword: confirmPassword,
          scope: privacyAction === 'account' ? 'account' : 'entries',
        },
      });
      setConfirmPassword('');
      if (privacyAction === 'account') {
        queryClient.clear();
        onClose?.();
        await refreshSession();
        navigate('/');
        return;
      }
      await queryClient.invalidateQueries();
      setPrivacyNotice({ tone: 'success', text: res.message });
      setPrivacyAction(null);
    } catch (err) {
      setPrivacyNotice({ tone: 'error', text: err.message });
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function handleLogout() {
    onClose?.();
    await logout();
    navigate('/masuk');
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan Akun"
      >
        <div className={styles.header}>
          <div>
            <h2 className="cardTitle">Pengaturan Akun</h2>
            <span className="muted-text" style={{ fontSize: 'var(--text-xs)' }}>
              {user.accountCode} • {ROLE_LABELS[user.role] || user.role}
            </span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Tutup panel akun"
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Informasi Akun & Sekolah</h3>
          <div className={styles.metaRow}>
            <span className="muted-text">Kode Akun</span>
            <strong>{user.accountCode}</strong>
          </div>
          <div className={styles.metaRow}>
            <span className="muted-text">Sekolah</span>
            <strong>{school?.name || '-'}</strong>
          </div>
          <div className={styles.metaRow}>
            <span className="muted-text">Zona Waktu</span>
            <strong>{school?.timezone || 'Asia/Jakarta'}</strong>
          </div>
          {user.gradeGroup && (
            <div className={styles.metaRow}>
              <span className="muted-text">Kelompok</span>
              <strong>{user.gradeGroup}</strong>
            </div>
          )}
          {(user.role === 'bk' || user.role === 'superadmin') && user.mfaEnabled && (
            <div className={styles.metaRow}>
              <span className="muted-text">Status MFA</span>
              <Badge tone="success">
                <ShieldCheck size={14} aria-hidden="true" />
                {user.mfaEnabled ? 'MFA TOTP Aktif' : 'Belum Diatur'}
              </Badge>
            </div>
          )}
        </section>

        <Disclosure title="Keamanan Kata Sandi">
          <StatusNotice tone={pwStatus?.tone}>{pwStatus?.text}</StatusNotice>
          <form onSubmit={handlePasswordSubmit} className="stack-sm">
            <Input
              label="Kata Sandi Saat Ini"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Input
              label="Kata Sandi Baru (min. 8 karakter)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Button type="submit" variant="secondary" disabled={pwLoading}>
              {pwLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
            </Button>
          </form>
        </Disclosure>

        {user.role === 'student' && (
          <section className={`${styles.section} ${styles.dangerZone}`}>
            <h3 className={styles.sectionTitle}>
              <ShieldAlert
                size={16}
                aria-hidden="true"
                style={{ display: 'inline', marginRight: 6 }}
              />
              Privasi & Data
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Catatan pribadimu dapat diakses olehmu dan Superadmin (tercatat audit). BK hanya
              melihat metadata aktivitas. Status fitur pribadi:{' '}
              <strong>
                {accountApprovalMode
                  ? canUsePersonalFeatures
                    ? 'Aktif setelah persetujuan akun'
                    : 'Dijeda'
                  : consentStatus?.hasActiveConsent
                    ? `Aktif (v${consentStatus.activePolicyVersion})`
                    : consentStatus?.activePolicyVersion
                      ? 'Belum aktif'
                      : 'Kebijakan belum tersedia'}
              </strong>
              .
            </p>
            {!canUsePersonalFeatures && (
              <Link to="/app/persetujuan" className="btnLink" onClick={onClose}>
                {accountApprovalMode ? 'Kelola Pencatatan Aktivitas' : 'Lihat Persetujuan Data'}
              </Link>
            )}
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.55,
              }}
            >
              <li>
                <strong>{accountApprovalMode ? 'Jeda pencatatan' : 'Tarik persetujuan'}:</strong>{' '}
                menghentikan pengumpulan baru, pengingat, dan agregasi; Pustaka dan Bantuan tetap
                tersedia.
              </li>
              <li>
                <strong>Hapus entri pribadi:</strong> menghapus seluruh mood, jurnal, latihan,
                rencana, refleksi.
              </li>
              <li>
                <strong>Hapus akun:</strong> mencabut sesi dan membersihkan akun serta relasi
                pribadimu.
              </li>
            </ul>
            <StatusNotice tone={privacyNotice?.tone}>{privacyNotice?.text}</StatusNotice>

            <div className="cluster">
              <Button variant="secondary" size="sm" onClick={() => setPrivacyAction('export')}>
                <Download size={15} aria-hidden="true" />
                <span>Ekspor Data Pribadi</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canUsePersonalFeatures}
                onClick={() => setPrivacyAction('withdraw')}
              >
                {accountApprovalMode ? 'Jeda Pencatatan' : 'Tarik Persetujuan'}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setPrivacyAction('entries')}>
                Hapus Entri
              </Button>
              <Button variant="danger" size="sm" onClick={() => setPrivacyAction('account')}>
                Hapus Akun
              </Button>
            </div>

            {privacyAction === 'withdraw' && (
              <div className="stack-sm" style={{ paddingTop: 8 }}>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  {accountApprovalMode
                    ? 'Jeda pencatatan aktivitas dan pengingat?'
                    : 'Yakin ingin menarik persetujuan data sekarang?'}
                </p>
                <div className="cluster">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={privacyLoading}
                    onClick={handleWithdrawConsent}
                  >
                    {privacyLoading
                      ? 'Memproses...'
                      : accountApprovalMode
                        ? 'Ya, Jeda Pencatatan'
                        : 'Ya, Tarik Persetujuan'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPrivacyAction(null)}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {privacyAction === 'export' && (
              <div className="stack-sm" style={{ paddingTop: 8 }}>
                <Input
                  label="Masukkan kata sandi untuk mengunduh salinan data pribadimu"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="cluster">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={privacyLoading || !confirmPassword}
                    onClick={() => handleExportPersonal('json')}
                  >
                    Unduh JSON
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={privacyLoading || !confirmPassword}
                    onClick={() => handleExportPersonal('csv')}
                  >
                    Unduh CSV
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPrivacyAction(null)}>
                    Batal
                  </Button>
                </div>
              </div>
            )}

            {(privacyAction === 'entries' || privacyAction === 'account') && (
              <form onSubmit={handleDeletionSubmit} className="stack-sm" style={{ paddingTop: 8 }}>
                <Input
                  label={
                    privacyAction === 'account'
                      ? 'Masukkan kata sandi untuk menghapus akun permanen'
                      : 'Masukkan kata sandi untuk menghapus seluruh entri pribadi'
                  }
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <div className="cluster">
                  <Button type="submit" variant="danger" size="sm" disabled={privacyLoading}>
                    {privacyLoading ? 'Menghapus...' : 'Konfirmasi Penghapusan'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPrivacyAction(null)}>
                    Batal
                  </Button>
                </div>
              </form>
            )}
          </section>
        )}

        <Button variant="ghost" fullWidth onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" />
          <span>Keluar dari Akun</span>
        </Button>
      </aside>
    </div>
  );
}
