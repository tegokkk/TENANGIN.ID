# Menyiapkan TENANGIN.ID untuk production

Status alur terbaru: fitur utama siswa pada ruang layanan ini memakai persetujuan akun Superadmin (`account_approval`) tanpa gerbang kebijakan tambahan. Bootstrap baru memasang panduan produk asli dan mengaktifkan penerimaan bantuan oleh Superadmin, tanpa menambahkan siswa atau aktivitas dummy. Mode kebijakan `consent` tetap dapat dipilih pengelola. Lihat [STUDENT_DASHBOARD.md](STUDENT_DASHBOARD.md) untuk konfigurasi dan batas fitur; catatan pembersihan di bawah merekam keadaan sebelum pengaturan ini.

UI sudah memakai tampilan layanan tanpa badge Mode contoh/Demo dan tanpa pintasan kredensial akun uji. Istilah teknis mode demo/pilot tetap berada dalam konfigurasi operator dan fixture pengujian. Mode data nyata saat ini bernama APP_MODE=pilot; nama tersebut bukan label pada UI.

Pustaka hanya tersedia setelah login. Halaman /pustaka mengarahkan pengunjung ke halaman masuk dan kembali ke Pustaka setelah autentikasi selesai. API artikel dan latihan memerlukan sesi aktif (MFA hanya berlaku bila diaktifkan secara opsional); responsnya tidak boleh di-cache. Service worker versi terbaru menghapus cache publik lama dan tidak menyimpan konten Pustaka. Informasi bantuan tetap tersedia tanpa login.

## 1. Isi konfigurasi resmi

Salin backend/.env.production.example menjadi backend/.env.production pada server, lalu isi origin HTTPS, database production terpisah, secret sesi, keyring enkripsi dan kredensial operator. File konfigurasi asli diabaikan Git. Proses production membaca profil ini dan tidak memuat backend/.env development. Nilai dari environment service tetap memiliki prioritas.

Production menolak APP_MODE=demo, ALLOW_DEMO_SEED=true, origin HTTP dan database tenangin_demo. Placeholder secret tidak dapat digunakan untuk memulai layanan. Jangan menyalin database demo sebagai data sekolah nyata. Data dummy runtime sudah dibersihkan. Database aplikasi dipisahkan dari fixture pengujian. Seed tidak dapat berjalan di luar environment test atau pada koneksi yang bukan database test.

## 2. Build dan migrasi

```bash
npm ci
npm run build
npm run db:migrate:production
```

Migrasi memerlukan DATABASE_ADMIN_URL milik operator dan WORKER_DATABASE_URL dengan role worker terpisah pada database yang sama. Proses migrasi juga menyiapkan schema pg-boss, lalu mencabut kembali izin CREATE database sementara yang diperlukan saat pemasangan pertama. Worker production memakai schema yang sudah disiapkan dan tidak menjalankan migrasi sendiri. Berikan hanya pada proses migrasi, bukan service API/worker. Database runtime menggunakan akun dengan hak minimum sesuai runbook. Backup sebelum upgrade database yang sudah berisi data; ikuti prosedur rollback dan ledger penghapusan pada OPERATIONS_RUNBOOK.md.

## 3. Provisioning dan kebijakan

Operator membuat akun Superadmin pertama dengan `npm run bootstrap:production` sesuai runbook. Cukup isi `BOOTSTRAP_ADMIN_EMAIL` dan `BOOTSTRAP_ADMIN_PASSWORD` (minimal 12 karakter) di environment operator. Kode dan nama sekolah tidak wajib; sistem menyiapkan ruang kerja TENANGIN.ID dengan kode internal TENANGIN-ID. `BOOTSTRAP_SCHOOL_CODE` dan `BOOTSTRAP_SCHOOL_NAME` tetap didukung sebagai opsi untuk instalasi yang memilih ruang kerja lain. Ruang kerja bawaan tidak mengesahkan sekolah, kontak, kebijakan, atau instrumen. Bootstrap membuat hanya satu Superadmin dengan login email dan sandi, kontak/jam layanan kosong, serta review tata kelola berstatus pending. Isikan kebijakan persetujuan, penugasan, materi yang ditinjau, kontak terverifikasi, jam layanan dan keputusan wali dari pengelola sebenarnya.

Skrining baru dapat dipakai setelah instrumen, hak penggunaan, skoring dan pengesahan ahli tersedia. Template uji tidak dapat diaktifkan melalui endpoint template pada mode data nyata. Fitur siswa menampilkan Skrining belum tersedia ketika yang tersedia hanya fixture simulasi; riwayat simulasi tetap ditandai sesuai asalnya.

## 4. Jalankan service

```bash
npm run start:production
npm run worker:production
```

Keduanya adalah proses terpisah yang perlu dikelola service manager pada server. API mengikat 127.0.0.1:3000; tempatkan reverse proxy HTTPS pada server yang sama. TRUST_PROXY=1 sesuai satu proxy yang ditetapkan tersebut. Build frontend wajib tersedia sebelum API production dijalankan.

Periksa /api/health, /api/ready, cookie Secure/HttpOnly, login/MFA, persetujuan dan alur setiap role melalui domain HTTPS. Aktifkan monitoring, backup terenkripsi/off-site, ledger penghapusan dan prosedur pemulihan sesuai runbook. Kunci VAPID resmi diperlukan bila push eksternal dipakai.

## 5. Status

Data dummy lokal sudah dihapus, profil lokal diarahkan ke database bersih, secret sesi/enkripsi diperbarui, pasangan VAPID tetap dibuat, dan Superadmin awal dengan login email dan sandi disiapkan sesuai email pengelola. Kredensial awal disimpan di .local/production-setup/ADMIN_ACCESS.txt yang diabaikan Git dan dibatasi ke pengguna Windows. Domain belum diisi sesuai keputusan pengelola; APP_ORIGIN pada profil production tetap kosong sehingga layanan tidak dapat dianggap sudah tayang. Tidak dilakukan deployment atau pengesahan keputusan ahli. Kesiapan penggunaan data siswa nyata tetap mengikuti gerbang review sekolah/ahli pada TASKLIST dan LIMITATIONS_AND_REVIEW.md. Operator harus mengisi konfigurasi resmi dan memverifikasi lingkungan tujuan sebelum membuka akses.

## 6. Data setelah pembersihan

Database aplikasi hanya memuat ruang kerja teknis TENANGIN.ID, satu akun Superadmin pengelola, review tata kelola yang belum disahkan, serta log operasional yang dibuat saat verifikasi. Tidak ada siswa, BK, persetujuan pengguna, materi, latihan, instrumen, atau aktivitas siswa bawaan. Tabel dan katalog pg-boss merupakan infrastruktur operasional, bukan dataset siswa.

Pembuat akun dengan sandi tetap dinonaktifkan. Login tidak menampilkan daftar kredensial. Halaman bantuan tidak lagi berisi nama guru atau jam pertemuan buatan; kontak kosong ditampilkan sebagai belum dikonfigurasi. Sekolah baru tidak otomatis memperoleh kebijakan aktif atau kontak terverifikasi. Startup production menolak sekolah fixture dan instrumen simulasi meskipun nama databasenya telah diubah.

Fixture untuk Vitest/Playwright tetap berada pada sumber pengujian. Database pengujian dibersihkan kembali setelah verifikasi; pengujian berikutnya dapat mengisinya tanpa mengubah database aplikasi.

Keputusan pengelola 20 November 2026: kode authenticator tidak diwajibkan. MFA akun Superadmin awal dinonaktifkan dan kunci TOTP/kode pemulihannya dihapus. Bootstrap berikutnya memakai login email dan sandi secara default; MFA hanya diaktifkan atas pilihan operator melalui BOOTSTRAP_ENABLE_MFA=true. Tidak ada langkah penyiapan authenticator pada login standar.

Keputusan pengelola 20 November 2026: aktivasi token publik diganti pendaftaran siswa dan persetujuan melalui dashboard Superadmin. Lihat STUDENT_REGISTRATION.md. Siswa belum dapat masuk sebelum disetujui; persetujuan data pribadi tetap terpisah.

Perbaikan login 20 November 2026: siswa yang disetujui langsung masuk ke ruang siswa meskipun kebijakan data belum diterbitkan. Pustaka dan Bantuan tersedia; fitur pribadi menampilkan kebutuhan persetujuan di dalam aplikasi. Superadmin dapat menerbitkan kebijakan yang ditinjau sekolah pada Pengaturan → Kebijakan Data Siswa. Kebijakan kosong tidak lagi menimbulkan 404 atau mengunci login. Persetujuan siswa dan wali tidak dibuat otomatis.
