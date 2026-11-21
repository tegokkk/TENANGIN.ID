# Audit Ekspor Stitch (Tahap A: T05-T08)

| Atribut | Nilai |
| --- | --- |
| Tanggal | 20 November 2026 |
| Sumber | `stitch_tenangin_prototype_platform/` (D01-D09) |
| Acuan | `PRD.md` v1.1 (Bagian 4.2, 8, 10, 13, 15, 26), `design.md` v2.1, `structure.md` v1.0 |

---

## 1. Pemetaan Folder Ekspor ke Halaman & File (T05)

Ekspor asli di `stitch_tenangin_prototype_platform/` tetap dipertahankan utuh sebagai referensi visual.

| ID | Folder Stitch | Rute Aplikasi | File Halaman React (`frontend/src/pages/`) | Layout | Peran |
| --- | --- | --- | --- | --- | --- |
| D01 | `d01_landing_page` | `/` | `public/LandingPage.jsx` | `PublicLayout` | Publik |
| D02 | `d02_beranda_siswa` | `/app` | `student/HomePage.jsx` | `StudentLayout` | `student` |
| D03 | `d03_tenang` | `/app/tenang`, `/pustaka` | `student/TenangPage.jsx` | `StudentLayout` / `PublicLayout` | `student` / Publik |
| D04 | `d04_catat` | `/app/catat` | `student/JournalPage.jsx` | `StudentLayout` | `student` |
| D05 | `d05_refleksi` | `/app/refleksi` | `student/ReflectionPage.jsx` | `StudentLayout` | `student` |
| D06 | `d06_bantuan` | `/bantuan`, `/app/bantuan` | `public/HelpPage.jsx` | `PublicLayout` / `StudentLayout` | Publik / `student` |
| D07 | `d07_dashboard_bk_monitoring_read_only` | `/bk` | `counselor/DashboardPage.jsx` | `CounselorLayout` | `bk` (Read-only) |
| D08 | `d08_dashboard_superadmin_akses_penuh` | `/superadmin`, `/admin` | `superadmin/DashboardPage.jsx` | `SuperadminLayout` | `superadmin` |
| D09 | `d09_login` | `/masuk`, `/login`, `/aktivasi`, `/pemulihan`, `/persetujuan` | `auth/LoginPage.jsx` | `AuthLayout` | Publik -> Redirect Role |

> Catatan: Sesuai `design.md` v2.1, aplikasi dibatasi menjadi **9 halaman utama** (D01-D09). Alur aktivasi, pemulihan, persetujuan F1, MFA staf, detail tugas, player latihan, pustaka accordion, dan panel pengaturan akun dikelola sebagai state/komponen inline pada halaman terkait, tanpa menambah halaman terpisah yang tidak perlu.

---

## 2. Perbandingan Ekspor HTML/PNG terhadap PRD v1.1 & design.md v2.1 (T06)

### 2.1 Temuan Lintas Halaman (Shell & Navigasi)
1. **D02-D06 memiliki navigasi ganda (sidebar fixed kiri + top header):** `design.md` v2.1 mensyaratkan desktop siswa memakai top header dengan 4 menu (**Beranda, Tenang, Catat, Refleksi**), tombol **"Butuh bicara?"**, dan menu akun; mobile memakai 4 menu yang sama pada navigasi bawah yang tidak menutup konten/input.
2. **D07 dan D08 memakai header siswa (`Awan-028 / Siswa SMA / Beranda Tenang Catat Refleksi`):** Bug salin-tempel dari Stitch. D07 wajib memakai `CounselorLayout` (badge **Akses pemantauan (Read-Only)**, identitas BK), dan D08 wajib memakai `SuperadminLayout` (badge **Akses penuh**, identitas Superadmin).
3. **Klaim privasi lama & indikator live palsu:** Sidebar D02-D06 menyebut `"teranonimkan secara ketat"` dan header menampilkan `"BK Online: 07.30 - 15.30 WIB"` dengan titik hijau aktif. PRD melarang klaim anonimitas mutlak dan status `"online/tersedia sekarang"` tanpa sumber status nyata.
4. **Link mati `href="#"`:** Seluruh tautan navigasi dan CTA pada ekspor Stitch masih `href="#"`.

### 2.2 Temuan Per Halaman (D01-D09)

| Halaman | Temuan Ketidaksesuaian pada Ekspor Stitch | Penyesuaian Wajib pada Implementasi |
| --- | --- | --- |
| **D01 Landing** | Header masih menampilkan avatar akun dummy meski belum login; footer menyebut `119` hardcoded; bagian cara kerja menyebut `"Terenkripsi privat"` tanpa menyebut akses Superadmin; tautan menu `Fitur Utama` / `Privasi` tidak terhubung. | Hapus avatar dummy saat belum login; tampilkan kontak terverifikasi dari konfigurasi sekolah dengan label `Mode contoh`; jelaskan akses pemilik + Superadmin serta BK read-only; hubungkan anchor dan CTA `"Mulai dengan tenang"` ke `/masuk`, `"Butuh bicara?"` ke `/bantuan`. |
| **D02 Beranda** | Menampilkan skor `"73% Harmonis"` dan `"Kondisi Mental Terakhir"` karangan; pesan guru BK hardcoded `"Kelas XII"`; menyebutkan `"DASS-21 / PHQ-9"` yang belum disahkan; sub-langkah tugas & blok istirahat/tidur belum interaktif penuh; pengaturan jam tenang/hari pengingat belum ada; teks sukses mood hardcoded. | Hapus skor `"73% Harmonis"` dan `"DASS-21/PHQ-9"`; tampilkan kondisi nyata dari API; dukung CRUD tugas, langkah kecil inline, target tanggal, penanda Penting/Mendesak, pesan netral lewat tanggal, dan blok istirahat/tidur inline; pengingat default OFF dengan hari/waktu/jam tenang + banner dalam aplikasi; pesan kelompok dinamis; skrining opsional default `"Instrumen belum tersedia"` dan mode simulasi berlabel `"Simulasi, bukan hasil penilaian"`. |
| **D03 Tenang** | Timer latihan otomatis berjalan saat halaman dibuka (`startTimer()` saat load); label tombol berhenti `"Selesaikan Latihan"` menyamakan berhenti dengan selesai; durasi aktif tidak memperhitungkan perpindahan tab; `prefers-reduced-motion` belum ditangani; artikel pustaka statis di HTML. | Tidak ada autoplay timer/suara; mulai hanya saat user klik **Mulai**; hitung `active_seconds` lewat selisih timestamp termasuk perpindahan tab; tombol **Berhenti** selalu tersedia tanpa label gagal dengan pesan `"Latihan dihentikan. Kamu bisa kembali kapan pun."`; hormati `prefers-reduced-motion`; ambil 3 latihan & artikel **Baca Sebentar** terbit dari API (mendukung 6 artikel F8, pencarian, dan tampilan publik `/pustaka`). |
| **D04 Catat** | UI menampilkan `"Draft tersimpan di peramban lokal"` (melanggar PRD F3-AC6 yang melarang penyimpanan draf pribadi di localStorage/cache publik); belum ada counter 2.000 karakter; belum ada proteksi edit bentrok 2 tab (`version`). | Pertahankan draf kotor hanya di memori React dengan konfirmasi keluar; larang keras penulisan jurnal ke `localStorage`/`sessionStorage`; batas 2.000 karakter per isian; optimistic concurrency (`version` -> HTTP 409); pertahankan input saat gagal simpan; gunakan label exact PRD: `"Catatan dapat diakses olehmu dan Superadmin. BK hanya melihat aktivitas penggunaan."` |
| **D05 Refleksi** | Batas karakter pada HTML hanya `400`, sedangkan PRD F7 menetapkan `2.000` karakter; periode minggu masih statis; tombol riwayat belum memuat data ke form untuk edit/hapus; banner bawah masih menyebut janji bicara langsung ke konselor tanpa alur Superadmin. | Gunakan batas `2.000` karakter per jawaban; hitung minggu lokal Senin-Minggu berdasarkan zona waktu sekolah; tag strategi terkurasi opsional disimpan terpisah; klik riwayat memuat data ke area yang sama untuk lihat/edit/hapus. |
| **D06 Bantuan** | Menampilkan banner tiket dummy yang seolah sudah terkirim; masih menyebut `"Respons Resmi Guru BK"` alih-alih pengelola administratif Superadmin; pratinjau tidak selalu muncul sebagai langkah eksplisit sebelum kirim; nomor/email contoh belum terikat konfigurasi sekolah. | Bagian atas publik tersedia tanpa login + fallback statis saat API gagal; pengelola/penerima di aplikasi adalah **Superadmin** (mengkoordinasikan layanan sekolah); alur **Form -> Tinjau permintaan (pratinjau) -> Kirim (idempoten) -> Status** di satu halaman; cegah lampiran otomatis jurnal/mood/skor; tombol kirim dinonaktifkan jika pengelola layanan sekolah belum ditetapkan. |
| **D07 Dashboard BK** | Header salah memakai navigasi siswa; memiliki tombol `"Unduh Rekap Agregat (PDF)"` (fase lanjutan L04); kartu agregat hardcoded tanpa status supresi `k = 5`; row `Awan-009` menampilkan `"Kategori: Regulasi Waktu"` yang berisiko membocorkan detail. | Pakai `CounselorLayout` (badge Read-Only); tampilkan kartu agregat mingguan dengan status supresi `k = 5` (`"Data belum cukup untuk ditampilkan"`); tabel metadata strictly allowlist (`Kode Siswa / Aktivitas / Waktu / Status / Durasi`) sesuai penugasan aktif BK; hapus tombol ekspor PDF dan seluruh kontrol mutasi. |
| **D08 Dashboard Superadmin** | Header salah memakai navigasi siswa; 6 tab pada bilah navigasi statis (tab ke-6 terpotong pada screenshot, konten tab 2-6 belum diimplementasikan sebagai panel interaktif); log audit item ke-2 salah menulis `"BK-Rani-01 memperbarui status sesi konseling"`, padahal PRD Bagian 26 menegaskan BK read-only dan bantuan dikelola Superadmin. | Pakai `SuperadminLayout`; lengkapi semua **6 panel tab interaktif** (*Ringkasan, Akun & Role, Data Siswa, Konten, Bantuan & Pesan, Pengaturan & Audit*) yang terhubung penuh ke `/api/superadmin/*`; perbaiki log audit agar akurat; catat audit untuk setiap baca isi pribadi maupun mutasi. |
| **D09 Login** | `main` dibatasi `max-w-[480px]`, membuat tata letak 2 kolom desktop terjepit sempit (lihat `d09_login/screen.png`); tombol `"Butuh bicara darurat?"` memicu `alert()` berisi nomor fiktif `0800-110-TEEN`; belum ada UI inline untuk aktivasi, pemulihan, persetujuan F1, maupun langkah MFA staf. | Perlebar wadah desktop ke `max-w-[960px]` agar 2 kolom proporsional dan nyaman; hapus nomor fiktif `0800-110-TEEN` dan arahkan bantuan ke `/bantuan`; tambahkan sub-alur inline **Aktivasi Akun**, **Pemulihan Akun**, **Persetujuan Siswa (F1)**, dan **MFA Staf (TOTP/Recovery)** di halaman Login tanpa menambah file halaman baru. |

---

## 3. Inventaris Aset, Font, Ikon, Link & Dependency Eksternal (T07)

| Jenis di Ekspor Stitch | Temuan di `code.html` | Status Hak Pakai / Risiko | Pengganti Lokal dalam Aplikasi |
| --- | --- | --- | --- |
| CSS Framework | `<script src="https://cdn.tailwindcss.com">` | Tidak cocok untuk arsitektur production/offline & melanggar `structure.md` | **CSS Modules (`*.module.css`) + CSS custom properties** (`tokens.css`) |
| Font | Google Fonts CDN (`Plus Jakarta Sans`) | Bergantung jaringan eksternal & kebocoran metadata ke Google | **`@fontsource/plus-jakarta-sans`** dibundel lokal di Vite |
| Ikon | Google Fonts CDN (`Material Symbols Outlined`, dimuat ganda 2x) | Bergantung CDN eksternal; fallback teks mentah jika gagal | **`lucide-react`** (inline SVG tree-shaken, aksesibel) |
| Gambar Logo | URL `https://lh3.googleusercontent.com/aida-public/...` pada D07, D08, D09 | URL sementara Stitch berisiko kedaluwarsa/403 & pelacakan eksternal | **`BrandLogo.jsx`** (inline SVG original) |
| Ilustrasi Hero | Inline SVG awan ungu di D01 + `cloud_done` icon di D09 | Bebas dipakai, milik rancangan proyek | **`CloudIllustration.jsx`** (inline SVG original yang rapi & mendukung `prefers-reduced-motion`) |
| Warna Latar | `code.html` mencampur `#FCF9EF` (`surface` Stitch) dan `#F8F7FC` | `design.md` v2.1 menetapkan latar `#F8F7FC`, utama `#6D35CF`, lime `#C7F43B`, lavender `#F1EBFF`, kartu `#FFFFFF`, teks `#25251F` / `#646459` | Disatukan di `frontend/src/styles/tokens.css` sesuai `design.md` v2.1 |

---

## 4. Rencana Konversi ke React + CSS Modules (T08)

1. Ekstrak seluruh variabel warna, tipografi, radius, elevasi, jarak, dan breakpoint ke `frontend/src/styles/tokens.css`, `reset.css`, dan `globals.css`.
2. Bangun komponen UI bersama bebas-domain di `frontend/src/components/ui/` (`Button`, `Card`, `Input`, `Textarea`, `Badge`, `Switch`, `Accordion`, `Dialog`, `Toast`, `Tabs`) dan komponen state di `frontend/src/components/states/` (`LoadingState`, `EmptyState`, `ErrorState`, `SessionExpiredState`, `OfflineBanner`, `UnauthorizedState`, `SuppressedDataState`).
3. Bangun 5 shell layout di `frontend/src/layouts/` (`PublicLayout`, `AuthLayout`, `StudentLayout`, `CounselorLayout`, `SuperadminLayout`).
4. Konversi setiap layar D01-D09 menjadi halaman JSX yang memanggil hook TanStack Query (`features/*/hooks/*`) -> API client dengan cookie sesi + CSRF header -> backend Express + PostgreSQL.
