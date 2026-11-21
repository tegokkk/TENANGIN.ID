import { Link } from 'react-router';
import {
  ArrowRight,
  BookOpen,
  Eye,
  HeartHandshake,
  Lock,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Wind,
} from 'lucide-react';
import { FigmaBrandHero } from '../../components/ui/FigmaBrandHero.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { roleHomePath } from '../../guards/role-home.js';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const { authenticated, user, school } = useAuth();

  const primaryCtaTo = authenticated && user ? roleHomePath(user.role) : '/masuk';

  return (
    <div className={styles.stack}>
      <FigmaBrandHero
        primaryCtaTo={primaryCtaTo}
        primaryCtaLabel={authenticated ? 'Buka Ruang Saya' : 'Mulai dengan tenang'}
      />

      <section id="cara-kerja" className="stack-md">
        <div className={styles.sectionHeader}>
          <div>
            <Badge tone="lavender">Alur Pendampingan Mandiri</Badge>
          </div>
          <h2 className="sectionTitle">Empat Langkah Sederhana Mengelola Stres Belajar</h2>
          <p className="muted-text prose" style={{ margin: 0 }}>
            Semua aktivitas bersifat sukarela dan tidak menjadi bahan penilaian akademik.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <Card className={styles.stepCard}>
            <div className="stack-sm">
              <div className={styles.stepTop}>
                <span className={styles.stepIcon}>
                  <Sparkles size={20} aria-hidden="true" />
                </span>
                <span className={styles.stepNum}>01</span>
              </div>
              <h3 className="cardTitle">Kenali</h3>
              <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                Catat suasana hati harian dalam lima pilihan sederhana beserta tingkat tekanan
                belajar opsional.
              </p>
            </div>
            <span className={styles.stepMeta}>Bisa dilewati kapan saja</span>
          </Card>

          <Card className={styles.stepCard}>
            <div className="stack-sm">
              <div className={styles.stepTop}>
                <span className={`${styles.stepIcon} ${styles.stepIconLime}`}>
                  <NotebookPen size={20} aria-hidden="true" />
                </span>
                <span className={styles.stepNum}>02</span>
              </div>
              <h3 className="cardTitle">Catat</h3>
              <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                Uraikan situasi, pikiran, perasaan, dan alternatif realistis tanpa analisis AI atau
                komentar publik.
              </p>
            </div>
            <span className={`${styles.stepMeta} ${styles.stepMetaSuccess}`}>
              Terenkripsi di server
            </span>
          </Card>

          <Card className={styles.stepCard}>
            <div className="stack-sm">
              <div className={styles.stepTop}>
                <span className={styles.stepIcon}>
                  <Wind size={20} aria-hidden="true" />
                </span>
                <span className={styles.stepNum}>03</span>
              </div>
              <h3 className="cardTitle">Latih</h3>
              <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                Latihan napas, relaksasi otot, dan mindfulness 3–5 menit dengan tombol berhenti
                kapan pun.
              </p>
            </div>
            <span className={styles.stepMeta}>Panduan teks selalu tersedia</span>
          </Card>

          <Card className={styles.stepCard}>
            <div className="stack-sm">
              <div className={styles.stepTop}>
                <span className={styles.stepIcon}>
                  <BookOpen size={20} aria-hidden="true" />
                </span>
                <span className={styles.stepNum}>04</span>
              </div>
              <h3 className="cardTitle">Refleksi</h3>
              <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                Jawab tiga pertanyaan mingguan tentang hal yang membantu, hambatan, dan rencana
                kecil ke depan.
              </p>
            </div>
            <span className={styles.stepMeta}>Pekan Senin–Minggu</span>
          </Card>
        </div>
      </section>

      <Card tone="lavender" id="privasi" className="stack-md">
        <div className={styles.sectionHeader}>
          <div>
            <Badge tone="primary">Transparansi Privasi &amp; Tata Kelola Data</Badge>
          </div>
          <h2 className="sectionTitle">Siapa Mengakses Apa di TENANGIN.ID</h2>
          <p className="muted-text prose" style={{ margin: 0 }}>
            Kami menjelaskan batas akses peran secara jujur sebelum kamu menyetujui penggunaan data
            pribadi.
          </p>
        </div>

        <div className={styles.privacyGrid}>
          <div className={styles.privacyItem}>
            <span className={styles.privacyIcon}>
              <Lock size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Akses Akun Sekolah</strong>
              <p className="muted-text" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                Siswa menggunakan identitas akun yang diberikan sekolah dan kata sandi pribadi.
                Akses informasi mengikuti peran dan kebijakan data yang berlaku.
              </p>
            </div>
          </div>

          <div className={styles.privacyItem}>
            <span className={styles.privacyIcon}>
              <Eye size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Guru BK: Pemantauan Tanpa Mengubah</strong>
              <p className="muted-text" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                Guru BK hanya melihat ringkasan aktivitas sesuai penugasan dan statistik kelompok
                (minimal 5 siswa berbeda). BK tidak membaca isi jurnal, refleksi, atau nilai mood.
              </p>
            </div>
          </div>

          <div className={styles.privacyItem}>
            <span className={styles.privacyIcon}>
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Akses Pemilik &amp; Superadmin Teraudit</strong>
              <p className="muted-text" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                Catatan dapat diakses olehmu dan Superadmin pengelola sistem resmi. Setiap pembacaan
                atau perubahan oleh Superadmin otomatis tercatat dalam log audit.
              </p>
            </div>
          </div>

          <div className={styles.privacyItem}>
            <span className={styles.privacyIcon}>
              <HeartHandshake size={20} aria-hidden="true" />
            </span>
            <div>
              <strong>Tanpa Diagnosis, Peringkat, atau Peringatan Otomatis</strong>
              <p className="muted-text" style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)' }}>
                Tidak ada leaderboard antarsiswa, tidak ada pemindaian AI atas jurnal, dan tidak ada
                peringatan otomatis dari skor ke guru atau wali.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card tone="muted" className={styles.ctaBanner}>
        <div className="stack-sm" style={{ maxWidth: 640 }}>
          <div>
            <Badge tone="warning">Batas Layanan &amp; Bantuan Sekolah</Badge>
          </div>
          <h2 className="cardTitle">Bukan layanan darurat medis dan tidak dipantau setiap saat.</h2>
          <p className="muted-text" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            {school?.serviceHours
              ? `Jam layanan sekolah (${school.name}): ${school.serviceHours}.`
              : 'Gunakan halaman Bantuan untuk melihat jam layanan dan kontak terverifikasi sekolah.'}
          </p>
        </div>
        <div className="cluster">
          <Link to="/bantuan" className="btnLinkLime">
            <span>Lihat Informasi Bantuan</span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
