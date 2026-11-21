import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  MessageCircleHeart,
  ShieldCheck,
} from 'lucide-react';
import { BrandLogo, BrandWordmark, BrandLockup } from '../../assets/illustrations/BrandLogo.jsx';
import { apiRequest } from '../../lib/api-client.js';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { roleHomePath } from '../../guards/role-home.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { StatusNotice } from '../../components/ui/Toast.jsx';
import styles from './LoginPage.module.css';
import { StudentRegistrationForm } from './StudentRegistrationForm.jsx';

const SLIDE_SPRING = { type: 'spring', stiffness: 250, damping: 28, mass: 0.95 };

export function LoginPage() {
  const { authenticated, user, mfaVerified, refreshSession, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const libraryDestination = location.state?.from === '/pustaka' ? '/pustaka' : null;
  const prefersReducedMotion = useReducedMotion();

  // 'student' = form di KIRI | 'staff' (Guru BK & Superadmin) = form di KANAN
  const [portalSide, setPortalSide] = useState('student');
  const [mode, setMode] = useState(location.pathname === '/daftar' ? 'register' : 'login'); // login | register | recover
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [recCode, setRecCode] = useState('');
  const [recToken, setRecToken] = useState('');
  const [recPassword, setRecPassword] = useState('');
  const [showRecPassword, setShowRecPassword] = useState(false);

  const [mfaCode, setMfaCode] = useState('');
  const [mfaRecoveryCode, setMfaRecoveryCode] = useState('');
  const [useMfaRecovery, setUseMfaRecovery] = useState(false);
  const [mfaSetupInfo, setMfaSetupInfo] = useState(null);
  const [recoveryCodesOnce, setRecoveryCodesOnce] = useState(null);

  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeMfaStep =
    authenticated &&
    (user?.role === 'bk' || user?.role === 'superadmin') &&
    user?.mfaEnabled &&
    !mfaVerified;

  const effectiveSide = activeMfaStep ? 'staff' : portalSide;
  const isStaffSide = effectiveSide === 'staff';

  useEffect(() => {
    if (!authenticated || !user) return;
    if (user.role === 'student') {
      navigate(libraryDestination || '/app', { replace: true });
    } else if (
      (user.role === 'bk' || user.role === 'superadmin') &&
      mfaVerified &&
      !recoveryCodesOnce
    ) {
      navigate(libraryDestination || roleHomePath(user.role), { replace: true });
    }
  }, [authenticated, user, mfaVerified, navigate, recoveryCodesOnce, libraryDestination]);

  useEffect(() => {
    if (location.pathname === '/daftar') {
      setPortalSide('student');
      setMode('register');
    } else if (location.pathname === '/masuk') setMode('login');
  }, [location.pathname]);

  function switchSide(nextSide) {
    if (location.pathname === '/daftar') navigate('/masuk');
    setPortalSide(nextSide);
    setMode('login');
    setNotice(null);
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: { identifier, password },
      });
      await refreshSession();
      if (data.nextStep === 'student_home') {
        navigate(libraryDestination || '/app', { replace: true });
      } else if (data.nextStep === 'bk_dashboard') {
        navigate(libraryDestination || '/bk', { replace: true });
      } else if (data.nextStep === 'superadmin_dashboard') {
        navigate(libraryDestination || '/superadmin', { replace: true });
      }
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecoverSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await apiRequest('/auth/recover', {
        method: 'POST',
        body: { accountCode: recCode, token: recToken, newPassword: recPassword },
      });
      setIdentifier(recCode);
      setPassword('');
      setMode('login');
      setNotice({ tone: 'success', text: res.message });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartMfaSetup() {
    setSubmitting(true);
    setNotice(null);
    try {
      const data = await apiRequest('/auth/mfa/setup', { method: 'POST', body: {} });
      setMfaSetupInfo(data);
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmMfaSetup(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await apiRequest('/auth/mfa/setup/confirm', {
        method: 'POST',
        body: { code: mfaCode },
      });
      setRecoveryCodesOnce(res.recoveryCodes || []);
      await refreshSession();
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyMfa(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const data = useMfaRecovery
        ? await apiRequest('/auth/mfa/recover', {
            method: 'POST',
            body: { recoveryCode: mfaRecoveryCode },
          })
        : await apiRequest('/auth/mfa/verify', {
            method: 'POST',
            body: { code: mfaCode },
          });
      await refreshSession();
      navigate(libraryDestination || roleHomePath(data.user.role), { replace: true });
    } catch (err) {
      setNotice({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const panelTransition = prefersReducedMotion ? { duration: 0 } : SLIDE_SPRING;

  return (
    <div className={styles.wrapper}>
      {!activeMfaStep && (
        <div className={styles.sideSwitcher} role="group" aria-label="Pilih tampilan masuk">
          <button
            type="button"
            aria-pressed={!isStaffSide}
            className={`${styles.sideTab} ${!isStaffSide ? styles.sideTabActive : ''}`}
            onClick={() => switchSide('student')}
          >
            {!isStaffSide && (
              <Motion.span
                layoutId="loginSidePill"
                className={styles.sideTabIndicator}
                transition={panelTransition}
              />
            )}
            <span className={styles.sideTabText}>
              <GraduationCap size={16} aria-hidden="true" />
              <span>Siswa</span>
            </span>
          </button>

          <button
            type="button"
            aria-pressed={isStaffSide}
            className={`${styles.sideTab} ${isStaffSide ? styles.sideTabActive : ''}`}
            onClick={() => switchSide('staff')}
          >
            {isStaffSide && (
              <Motion.span
                layoutId="loginSidePill"
                className={styles.sideTabIndicator}
                transition={panelTransition}
              />
            )}
            <span className={styles.sideTabText}>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Guru BK &amp; Superadmin</span>
            </span>
          </button>
        </div>
      )}

      <div className={styles.sliderGrid}>
        {/* Form Panel: KIRI = Siswa, KANAN = Guru BK & Superadmin */}
        <Motion.section
          layout
          transition={panelTransition}
          className={`${styles.formPanel} ${isStaffSide ? styles.slotRight : styles.slotLeft}`}
        >
          {activeMfaStep && (
            <ol className={styles.stepper} aria-label="Tahapan masuk akun">
              <li className={`${styles.stepItem} ${styles.stepItemDone}`}>
                <span className={styles.stepNum}>
                  <Check size={12} aria-hidden="true" />
                </span>
                <span>Akun</span>
              </li>
              <li className={`${styles.stepItem} ${styles.stepItemActive}`} aria-current="step">
                <span className={styles.stepNum}>2</span>
                <span>Verifikasi</span>
              </li>
              <li className={styles.stepItem}>
                <span className={styles.stepNum}>3</span>
                <span>Selesai</span>
              </li>
            </ol>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <Motion.div
              key={`${effectiveSide}-${activeMfaStep ? 'mfa' : mode}`}
              initial={prefersReducedMotion ? false : { opacity: 0, x: isStaffSide ? 28 : -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: isStaffSide ? -28 : 28 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="stack-md"
            >
              {activeMfaStep ? (
                <>
                  <div className="stack-sm">
                    <h2 className="cardTitle">
                      {user?.mfaEnabled ? 'Masukkan Kode Authenticator' : 'Aktifkan MFA Staf'}
                    </h2>
                    <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                      {user?.accountCode} • {user?.role === 'bk' ? 'Guru BK' : 'Superadmin'}
                    </p>
                  </div>

                  <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>

                  {recoveryCodesOnce ? (
                    <div className="stack-md">
                      <StatusNotice tone="success">
                        MFA aktif. Simpan kode pemulihan ini di tempat aman:
                      </StatusNotice>
                      <div className={styles.securityBox}>
                        <div className={styles.recoveryGrid}>
                          {recoveryCodesOnce.map((code) => (
                            <code key={code} className={`mono-text ${styles.recoveryCode}`}>
                              {code}
                            </code>
                          ))}
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setRecoveryCodesOnce(null);
                          navigate(libraryDestination || roleHomePath(user.role), {
                            replace: true,
                          });
                        }}
                      >
                        Lanjut ke Dashboard
                      </Button>
                    </div>
                  ) : !user?.mfaEnabled ? (
                    <div className="stack-md">
                      {!mfaSetupInfo ? (
                        <Button onClick={handleStartMfaSetup} disabled={submitting}>
                          Siapkan Authenticator
                        </Button>
                      ) : (
                        <form onSubmit={handleConfirmMfaSetup} className="stack-md">
                          <div className={styles.securityBox}>
                            <span style={{ fontSize: 'var(--text-xs)' }}>
                              Kunci secret authenticator:
                            </span>
                            <code
                              className="mono-text"
                              style={{ fontWeight: 700, wordBreak: 'break-all' }}
                            >
                              {mfaSetupInfo.secret}
                            </code>
                          </div>
                          <Input
                            label="Kode 6 Digit"
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value)}
                            placeholder="123456"
                            inputMode="numeric"
                            maxLength={6}
                            required
                          />
                          <Button type="submit" disabled={submitting}>
                            {submitting ? 'Memverifikasi...' : 'Aktifkan MFA & Masuk'}
                          </Button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyMfa} className="stack-md">
                      {!useMfaRecovery ? (
                        <Input
                          label="Kode 6 Digit Authenticator"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          placeholder="000000"
                          inputMode="numeric"
                          maxLength={6}
                          required
                        />
                      ) : (
                        <Input
                          label="Kode Pemulihan"
                          value={mfaRecoveryCode}
                          onChange={(e) => setMfaRecoveryCode(e.target.value)}
                          placeholder="Kode pemulihan MFA"
                          required
                        />
                      )}
                      <div className="cluster">
                        <Button type="submit" disabled={submitting}>
                          {submitting ? 'Memeriksa...' : 'Verifikasi & Masuk Dashboard'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUseMfaRecovery((v) => !v)}
                        >
                          {useMfaRecovery ? 'Pakai Kode 6 Digit' : 'Kode Pemulihan'}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className={styles.footerLinks}>
                    <Button variant="ghost" size="sm" onClick={() => logout()}>
                      Ganti Akun
                    </Button>
                    <Link
                      to="/bantuan"
                      className="btnLinkLime"
                      style={{ minHeight: 44, padding: '0 14px', fontSize: 'var(--text-sm)' }}
                    >
                      <MessageCircleHeart size={16} aria-hidden="true" />
                      <span>Butuh bicara?</span>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="cardTitle">
                    {mode === 'register'
                      ? 'Daftar Akun Siswa'
                      : mode === 'recover'
                        ? 'Pemulihan Sandi'
                        : isStaffSide
                          ? 'Masuk Guru BK & Superadmin'
                          : 'Masuk Siswa'}
                  </h2>

                  <StatusNotice tone={notice?.tone}>{notice?.text}</StatusNotice>

                  {mode === 'login' && (
                    <>
                      <form onSubmit={handleLoginSubmit} className="stack-md">
                        <Input
                          label={isStaffSide ? 'Email' : 'NISN'}
                          aria-label={
                            isStaffSide
                              ? 'Email (Kode Akun atau Email)'
                              : 'NISN (Kode Akun atau Email)'
                          }
                          name="identifier"
                          type={isStaffSide ? 'email' : 'text'}
                          inputMode={isStaffSide ? 'email' : 'numeric'}
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder={isStaffSide ? 'Email akun staf' : '10 digit NISN'}
                          autoComplete={isStaffSide ? 'email' : 'username'}
                          required
                        />
                        <Input
                          label="Kata Sandi"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Kata sandi"
                          autoComplete="current-password"
                          required
                          rightElement={
                            <button
                              type="button"
                              className={styles.eyeBtn}
                              aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                              onClick={() => setShowPassword((v) => !v)}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          }
                        />

                        <div className={styles.modeLinks}>
                          {!isStaffSide && (
                            <button
                              type="button"
                              className={styles.modeLinkBtn}
                              onClick={() => {
                                setNotice(null);
                                setMode('register');
                                navigate('/daftar');
                              }}
                            >
                              Daftar Akun
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.modeLinkBtn}
                            onClick={() => {
                              setNotice(null);
                              setMode('recover');
                            }}
                          >
                            Lupa sandi?
                          </button>
                        </div>

                        <Button type="submit" fullWidth disabled={submitting}>
                          <span>{submitting ? 'Memeriksa...' : 'Masuk'}</span>
                          <ArrowRight size={18} aria-hidden="true" />
                        </Button>
                      </form>
                    </>
                  )}

                  {mode === 'register' && (
                    <StudentRegistrationForm
                      onBack={(registeredNisn) => {
                        if (registeredNisn) {
                          setIdentifier(registeredNisn);
                          setPassword('');
                        }
                        setMode('login');
                        navigate('/masuk');
                      }}
                    />
                  )}

                  {mode === 'recover' && (
                    <form onSubmit={handleRecoverSubmit} className="stack-md">
                      <Input
                        label={isStaffSide ? 'Email' : 'NISN'}
                        value={recCode}
                        onChange={(e) => setRecCode(e.target.value)}
                        placeholder={isStaffSide ? 'Email akun staf' : '10 digit NISN'}
                        required
                      />
                      <Input
                        label="Token Pemulihan"
                        value={recToken}
                        onChange={(e) => setRecToken(e.target.value)}
                        placeholder="Token dari pengelola"
                        required
                      />
                      <Input
                        label="Kata Sandi Baru (min. 8 karakter)"
                        type={showRecPassword ? 'text' : 'password'}
                        value={recPassword}
                        onChange={(e) => setRecPassword(e.target.value)}
                        minLength={8}
                        required
                        rightElement={
                          <button
                            type="button"
                            className={styles.eyeBtn}
                            aria-label={showRecPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                            onClick={() => setShowRecPassword((v) => !v)}
                          >
                            {showRecPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        }
                      />
                      <div className="cluster">
                        <Button type="submit" disabled={submitting}>
                          {submitting ? 'Menyimpan...' : 'Simpan Sandi'}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setNotice(null);
                            setMode('login');
                          }}
                        >
                          Kembali
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className={styles.footerLinks}>
                    <Link to="/" className={styles.backLink}>
                      <ArrowLeft size={16} aria-hidden="true" />
                      <span>Beranda</span>
                    </Link>
                    <Link
                      to="/bantuan"
                      className="btnLinkLime"
                      style={{ minHeight: 44, padding: '0 14px', fontSize: 'var(--text-sm)' }}
                    >
                      <MessageCircleHeart size={16} aria-hidden="true" />
                      <span>Butuh bicara?</span>
                    </Link>
                  </div>
                </>
              )}
            </Motion.div>
          </AnimatePresence>
        </Motion.section>

        {/* Sliding Panel: KANAN saat Siswa, bergulir ke KIRI saat BK & Superadmin */}
        <Motion.section
          layout
          transition={panelTransition}
          className={`${styles.heroPanel} ${isStaffSide ? styles.heroPanelStaff : ''} ${
            isStaffSide ? styles.slotLeft : styles.slotRight
          }`}
        >
          <div className={styles.heroBrandRow}>
            <div className="cluster">
              <BrandLogo size={34} />
              <BrandWordmark />
            </div>
          </div>

          <div className={styles.heroCenter}>
            <BrandLockup width={320} />
            <AnimatePresence mode="wait" initial={false}>
              <Motion.div
                key={effectiveSide}
                initial={prefersReducedMotion ? false : { opacity: 0, x: isStaffSide ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, x: isStaffSide ? 20 : -20 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="stack-sm"
                style={{ alignItems: 'center' }}
              >
                <h1 className={styles.heroTitle}>
                  {isStaffSide ? 'Dashboard Sekolah.' : 'Ruang tenangmu.'}
                </h1>
                <p className={styles.heroDesc}>
                  {isStaffSide
                    ? 'Pemantauan BK dan pengelolaan sistem.'
                    : 'Cek mood, jeda sejenak, dan catat pikiran.'}
                </p>
              </Motion.div>
            </AnimatePresence>
          </div>

          {!activeMfaStep && (
            <button
              type="button"
              className={styles.slideCtaBtn}
              onClick={() => switchSide(isStaffSide ? 'student' : 'staff')}
            >
              {isStaffSide ? (
                <>
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Masuk Siswa</span>
                </>
              ) : (
                <>
                  <span>Masuk BK &amp; Superadmin</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </Motion.section>
      </div>
    </div>
  );
}
