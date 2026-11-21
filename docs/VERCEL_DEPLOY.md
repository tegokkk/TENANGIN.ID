# Deploy manual TENANGIN.ID ke Vercel

Konfigurasi disiapkan 21 November 2026. Belum ada proyek cloud, database, atau deployment yang dibuat oleh perubahan ini.

## 1. Arsitektur yang digunakan

| Bagian | Tempat menjalankan |
| --- | --- |
| React/Vite, ikon, audio, dan service worker | Vercel, output `frontend/dist` |
| Express API, login, sesi, CSRF, dan seluruh fitur peran | Vercel Function `api/index.mjs`, melalui `/api/*` pada domain yang sama |
| Data aplikasi dan sesi | PostgreSQL 15+ yang dapat dijangkau dari internet deployment |
| Agregasi mingguan, retensi harian, dan push berkala | Worker Node.js terpisah yang terus berjalan, memakai `npm run worker:production` |

Paket ini mempertahankan worker pg-boss yang sudah ada. `setInterval`, proses lokal PostgreSQL, dan perintah worker tidak dijalankan dari build Vercel. Tanpa worker, jadwal otomatis agregasi/retensi/push tidak berjalan; penghapusan data dari UI tetap diproses langsung oleh API. Pilih region Function yang dekat dengan database melalui pengaturan Vercel.

## 2. Siapkan database production

Gunakan database kosong atau database aplikasi yang sudah ada dengan kunci enkripsi yang sama. Jangan memakai `127.0.0.1`, database `tenangin_test`, atau dataset fixture. Vercel tidak dapat mengakses PostgreSQL di laptop melalui alamat lokal.

Siapkan tiga akses ke database yang sama:

- Operator migrasi: mempunyai hak DDL serta hak mengelola role/schema.
- `tenangin_app`: login untuk API, tanpa hak superuser/DDL.
- `tenangin_worker`: login worker dengan hak DML public dan kepemilikan/hak schema pg-boss yang disiapkan proses migrasi.

Operator membuat role login `tenangin_app` dan `tenangin_worker`, menetapkan password unik melalui pengelola database, lalu memakai URL yang sesuai. Role operator dan worker harus menggunakan endpoint langsung yang sama agar pemeriksaan penyiapan schema worker dapat memverifikasi target database. API boleh memakai endpoint pooler yang direkomendasikan pengelola PostgreSQL. Gunakan opsi TLS dari penyedia database; jangan mematikan verifikasi TLS sebagai solusi koneksi.

Salin `backend/.env.production.example` menjadi `backend/.env.production` **hanya pada komputer/server operator**. Isi `DATABASE_URL`, `DATABASE_ADMIN_URL`, `WORKER_DATABASE_URL`, `APP_ORIGIN` HTTPS, `SESSION_SECRET`, dan `ENCRYPTION_KEY`. File sebenarnya tidak boleh diunggah atau dimasukkan ke Git.

Dari root proyek, jalankan sendiri:

```bash
npm ci
npm run db:migrate:production
```

Migrasi juga menyiapkan schema pg-boss. Setelah migrasi, operator memastikan grant DML sesuai role:

```sql
GRANT USAGE ON SCHEMA public TO tenangin_app, tenangin_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenangin_app, tenangin_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenangin_app, tenangin_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tenangin_app, tenangin_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tenangin_app, tenangin_worker;
```

Jalankan SQL menggunakan role yang menjalankan migrasi. Jangan menjalankan seed pengujian pada database ini. Untuk database berisi data, lakukan backup dan pertahankan `ENCRYPTION_KEY_ID`, `ENCRYPTION_KEY`, serta keyring lama; mengganti kunci membuat catatan terenkripsi tidak dapat dibuka.

## 3. Buat Superadmin pertama

Tambahkan konfigurasi berikut pada environment operator atau `backend/.env.production`, menggunakan identitas pengelola sebenarnya:

```dotenv
BOOTSTRAP_SCHOOL_CODE=KODE-SEKOLAH
BOOTSTRAP_SCHOOL_NAME=Nama Sekolah
BOOTSTRAP_TIMEZONE=Asia/Jakarta
BOOTSTRAP_ADMIN_CODE=Superadmin-01
BOOTSTRAP_ADMIN_EMAIL=email-pengelola@domain-sekolah
BOOTSTRAP_ADMIN_PASSWORD=ISI_PASSWORD_UNIK_MINIMAL_12_KARAKTER
BOOTSTRAP_ENABLE_MFA=false
```

```bash
npm run bootstrap:production
```

Script menolak menimpa Superadmin yang sudah ada. Bootstrap membuat pengelola dan panduan produk, tanpa siswa atau aktivitas dummy. MFA dapat dipilih melalui konfigurasi operator; jika diaktifkan, simpan secret dan kode pemulihan yang ditampilkan pada tempat pribadi. Jangan masukkan `BOOTSTRAP_*` ke Vercel.

## 4. Import proyek pada dashboard Vercel

Unggah source ke repository Git milikmu, lalu pilih **Add New → Project → Import Git Repository**. Pakai konfigurasi berikut:

| Pengaturan | Nilai |
| --- | --- |
| Root Directory | Root repository (`.`), jangan `frontend` atau `backend` |
| Framework Preset | Other |
| Node.js | 24.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `frontend/dist` |
| Fluid Compute | Aktif |

`vercel.json` sudah mengatur build, routing, dan header. Jangan menambahkan perintah migrasi, bootstrap, atau worker ke Build Command. Build tidak memerlukan koneksi database.

Alternatif untuk deploy manual dari terminal: gunakan Vercel CLI dari root proyek dan ikuti pemilihan proyek/team sendiri. Persiapan ini tidak melakukan login, linking, atau deploy atas namamu.

## 5. Isi Environment Variables

Salin nama variabel dari [backend/.env.vercel.example](../backend/.env.vercel.example) ke **Project → Settings → Environment Variables**. Template berisi contoh, bukan secret yang siap dipakai.

| Variabel | Isi |
| --- | --- |
| `NODE_ENV` | `production` |
| `APP_MODE` | `pilot` |
| `ALLOW_DEMO_SEED` | `false` |
| `APP_ORIGIN` | Origin HTTPS final, misalnya `https://nama-proyek.vercel.app`, tanpa path |
| `TRUST_PROXY` | `1` |
| `DATABASE_URL` | URL runtime `tenangin_app` ke PostgreSQL production dengan TLS |
| `SESSION_SECRET` | Nilai acak unik minimal 32 karakter |
| `ENCRYPTION_KEY_ID` | `k1`, atau ID yang sudah digunakan database |
| `ENCRYPTION_KEY` | 32 byte acak dalam format 64 karakter hex; harus sama dengan operator/worker |
| `ENCRYPTION_KEYRING` | Kunci lama bila ada; opsional |
| `DB_POOL_MIN` | `0` |
| `DB_POOL_MAX` | `3` sebagai nilai awal; sesuaikan dengan kapasitas database |
| `DB_STATEMENT_TIMEOUT_MS` | `15000` |
| `LOG_LEVEL` | `info` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Pasangan tetap yang sama dengan worker, jika push browser digunakan |

Untuk menghasilkan satu secret acak di terminal pribadi operator:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Jalankan dua kali untuk memperoleh secret sesi dan kunci enkripsi yang berbeda pada instalasi baru. Jangan mengganti kunci database yang sudah berisi data.

`VITE_API_BASE_URL` tidak perlu diisi; default frontend adalah `/api`. Jangan menaruh password database atau secret ke variabel `VITE_*` karena nilainya masuk ke bundle browser. `DATABASE_ADMIN_URL`, `WORKER_DATABASE_URL`, `TEST_*`, dan `BOOTSTRAP_*` hanya berada pada environment operator/worker, bukan API Vercel.

Preview sebaiknya memakai database dan secret terpisah dari production. Aktifkan variabel pada environment yang akan dideploy, lalu **Redeploy** setelah mengubahnya. Perbarui `APP_ORIGIN` jika domain final berubah.

## 6. Jalankan worker terpisah

Pada host Node.js yang menjalankan proses terus-menerus, pasang source dan dependency, siapkan environment production dengan `WORKER_DATABASE_URL`, kunci enkripsi, dan VAPID yang sama, lalu jalankan:

```bash
npm ci
npm run worker:production
```

Kelola proses melalui service manager host. Worker memeriksa pengingat setiap 15 menit, agregasi Senin 01:00 dan retensi harian 02:00 Asia/Jakarta. Worker juga membersihkan sesi yang kedaluwarsa; API serverless tidak membuat timer pembersihan per instance. Lihat [runbook operasi](OPERATIONS_RUNBOOK.md) untuk backup dan pemulihan.

## 7. Pemeriksaan sebelum dan sesudah deploy

Sebelum deploy:

```bash
npm run build
npm run vercel:check
```

Pada environment operator dengan konfigurasi production yang sudah diisi, pemeriksaan format tambahan tersedia melalui `npm run vercel:check -- --env`. Pemeriksaan ini tidak menjalankan migrasi, membuat akun, atau menguji koneksi cloud.

Setelah deploy manual:

1. Buka `/api/health` dan `/api/ready`; keduanya harus mengembalikan JSON dengan status 200.
2. Buka `/api/tidak-ada`; respons harus 404 JSON, bukan halaman React.
3. Buka `/app/catat` secara langsung, lalu reload; halaman login atau ruang siswa harus termuat.
4. Masuk sebagai pengelola resmi; periksa cookie `tenangin.sid` memiliki `Secure`, `HttpOnly`, dan `SameSite=Lax`.
5. Periksa pendaftaran/persetujuan siswa, simpan dan buka kembali data, latihan, refleksi, dan bantuan menggunakan akun pengujian milikmu pada lingkungan yang sesuai.
6. Pastikan log worker menunjukkan startup dan jadwal berjalan; isi kontak serta jam layanan sebenarnya sebelum membuka layanan siswa.

API 503 saat cold start menunjukkan konfigurasi, schema, data fixture, atau koneksi database perlu diperiksa pada Runtime Logs. Tidak ada migrasi maupun seed otomatis pada saat Function dipanggil.

## 8. Catatan verifikasi dependensi

Audit npm pada source saat persiapan menunjukkan advisori pada tool pengujian Vitest/tinypool dan library Zod yang sudah digunakan proyek. Paket test tidak diimpor oleh Function. API membatasi JSON 128 KB, namun itu tidak menghapus status advisori Zod. Pembaruan mayor dependensi memerlukan pengujian kompatibilitas terpisah; tidak dilakukan `npm audit fix --force` dalam persiapan hosting ini. Tinjau ulang `npm audit` sebelum production dengan data nyata.

## Referensi konfigurasi

- [Vercel: Express](https://vercel.com/docs/frameworks/backend/express)
- [Vercel: Vite SPA](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel: Project Configuration](https://vercel.com/docs/project-configuration)
- [Vercel: Connection Pooling](https://vercel.com/kb/guide/connection-pooling-with-functions)
