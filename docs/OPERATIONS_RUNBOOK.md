# Runbook Operasional, Keamanan, Backup/Restore, dan Rollback

## 1. Pemisahan Lingkungan & Variabel Wajib

- Pisahkan database dan secret untuk `development`/`demo`, `test`, dan `pilot`.
- Saat menjalankan mode nyata (`APP_MODE=pilot`), pastikan:
  - `NODE_ENV=production`
  - `APP_MODE=pilot`
  - `ALLOW_DEMO_SEED=false`
  - `SESSION_SECRET` acak minimal 32 karakter (disimpan di secret manager / environment terproteksi, tidak di repositori).
  - `ENCRYPTION_KEY` 64 karakter hex (AES-256-GCM) dengan `ENCRYPTION_KEY_ID` aktif. Jika melakukan rotasi kunci, pindahkan kunci lama ke `ENCRYPTION_KEYRING=k0:<hex_lama>` agar catatan lama tetap dapat didekripsi.
- Gunakan akun database runtime non-superuser (`tenangin_app`, hak DML saja) untuk API server, dan pisahkan akun DDL (`tenangin_admin`) hanya untuk migrasi skema.

## 2. Provisioning Akun Superadmin Pertama (Pilot)

Seed runtime dinonaktifkan. `db:seed:test` hanya menulis pada environment/database test terisolasi. Di komputer operator, isi `backend/.env.production` dengan email dan sandi unik minimal 12 karakter:

```dotenv
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

Kode dan nama sekolah tidak perlu diisi. Ruang kerja bawaan adalah TENANGIN.ID (kode internal TENANGIN-ID), zona waktu Asia/Jakarta, dan kode akun Superadmin-01. Untuk instalasi khusus, `BOOTSTRAP_SCHOOL_CODE`, `BOOTSTRAP_SCHOOL_NAME`, `BOOTSTRAP_TIMEZONE`, dan `BOOTSTRAP_ADMIN_CODE` tetap didukung. Pertahankan kode ruang kerja lama bila ingin menargetkan instalasi yang sudah ada.

Setelah konfigurasi database dan migrasi selesai, jalankan dari root proyek:

```bash
npm run bootstrap:production
```

MFA opsional dan nonaktif secara default. Jika memilih `BOOTSTRAP_ENABLE_MFA=true`, simpan TOTP secret dan kode pemulihan yang tercetak satu kali di tempat pribadi. Bootstrap menolak menimpa admin yang sudah ada; perubahan sandi dilakukan lewat menu Akun setelah login.

## 3. Menjalankan Worker Terjadwal (`pg-boss`)

Jalankan worker terpisah dari proses HTTP API:

```bash
npm run dev:worker
```

Worker mengelola 4 antrean idempoten:

- `aggregate-weekly`: menghitung ulang snapshot mingguan dengan ambang supresi `k = 5`.
- `cleanup-retention`: membersihkan aktivitas pribadi > 90 hari (mood, skrining, jurnal, sesi, tugas/langkah, jadwal, refleksi), token kedaluwarsa, bantuan tertutup > 90 hari, metadata lama, dan log > 30 hari. Akhir evaluasi yang lebih cepat ditetapkan pada T73 dan diproses melalui penghapusan data evaluasi.
- `delete-account`: mengeksekusi penghapusan akun/entri, mencabut sesi, mencabut `push_subscriptions`, mencatat tombstone, dan menginvalidasi snapshot terdampak.
- `dispatch-push-reminders`: berjalan tiap 15 menit untuk memeriksa opt-in, persetujuan aktif, jam tenang zona waktu sekolah, serta mengirim pengingat Web Push VAPID bernaskah netral.

### Uji Kapasitas & Indeks (`L05`)

```bash
npm run capacity:check --workspace backend
```

Menjalankan `EXPLAIN (FORMAT JSON)` pada kueri berindeks utama dan menguji burst permintaan bersamaan terhadap pool PostgreSQL terkonfigurasi (`DB_POOL_MIN`, `DB_POOL_MAX`, `DB_STATEMENT_TIMEOUT_MS`).

## 4. Prosedur Backup Terenkripsi & Restore Aman

1. **Ekspor backup terenkripsi:**
   ```bash
   node backend/scripts/backup-restore.mjs export .local/backups/backup-harian.enc
   ```
2. **Restore dengan penerapan ulang tombstone penghapusan (wajib sebelum akses publik dibuka kembali):**
   ```bash
   node backend/scripts/backup-restore.mjs restore .local/backups/backup-harian.enc
   ```
   Script `restoreEncryptedBackup` mempertahankan ledger penghapusan TERBARU dari database sebelum mengganti tabel. Restore juga mencabut seluruh sesi. Script kemudian memulihkan isi tabel di dalam transaksi dan otomatis menghapus ulang seluruh `user_id` pada `deleted_account_tombstones` dan `deletion_requests`, mencabut sesi aktif mereka, serta menginvalidasi snapshot agregat terdampak. Penghapusan cakupan entri diterapkan ulang berdasarkan waktu permintaan, termasuk bantuan/respons, sehingga backup lama tidak menghidupkan entri yang sudah dihapus.
3. **Verifikasi otomatis berkala:**

   ```bash
   npm run backup:verify --workspace backend
   ```

4. **Inspeksi metadata backup sebelum restore:**
   ```bash
   node backend/scripts/backup-restore.mjs inspect .local/backups/backup-harian.enc
   ```
5. **Pembersihan cadangan lokal lama (rotasi 30 hari):**
   ```bash
   node backend/scripts/backup-restore.mjs prune-local .local/backups 30
   ```
6. **Otomatisasi Cron & Sinkronisasi Off-Site (Cloud Storage):**
   Contoh skrip backup harian operator (`/opt/tenangin/scripts/cron-backup.sh`):
   ```bash
   #!/usr/bin/env bash
   set -euo pipefail
   DATE=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/var/backups/tenangin"
   mkdir -p "$BACKUP_DIR"

   # Ekspor snapshot terenkripsi dan ledger
   node /opt/tenangin/backend/scripts/backup-restore.mjs export "$BACKUP_DIR/backup-$DATE.enc"
   node /opt/tenangin/backend/scripts/backup-restore.mjs export-ledger "$BACKUP_DIR/ledger-$DATE.enc"

   # Rotasi lokal 30 hari
   node /opt/tenangin/backend/scripts/backup-restore.mjs prune-local "$BACKUP_DIR" 30

   # Salin aman ke object storage terpisah (misal AWS S3 / GCS / Wasabi via rclone)
   # rclone copy "$BACKUP_DIR" remote-backup:tenangin-cold-storage/backups/
   ```
   Tambahkan ke crontab (`crontab -e`):
   ```cron
   0 3 * * * /opt/tenangin/scripts/cron-backup.sh >> /var/log/tenangin-backup.log 2>&1
   ```

## 5. Prosedur Rollback Migrasi / Deployment

1. Hentikan proses API dan worker agar tidak menulis data selama rollback.
2. Buat backup terenkripsi kondisi saat ini sebelum rollback.
3. Jika migrasi database terakhir perlu dibatalkan:
   ```bash
   npm run db:rollback --workspace backend
   ```
4. Kembalikan tag rilis aplikasi sebelumnya, jalankan `npm run build`, dan periksa `/api/health` serta `/api/ready` sebelum membuka akses.

## 6. Ledger eksternal dan pemulihan total

Restore pada database yang masih memiliki ledger mempertahankannya otomatis; jangan mengosongkan tabel ledger sebelum restore. Untuk pemulihan total ke database kosong, backup lama sendiri tidak mengetahui penghapusan yang terjadi setelah backup. Operator wajib mempertahankan ledger terenkripsi terbaru di penyimpanan terpisah, memperbaruinya setelah batch penghapusan, dan memverifikasinya sebelum akses dibuka:

```bash
node backend/scripts/backup-restore.mjs export-ledger /penyimpanan-terpisah/deletion-ledger.enc
node backend/scripts/backup-restore.mjs restore .local/backups/backup-harian.enc /penyimpanan-terpisah/deletion-ledger.enc
```

Ganti path dengan lokasi operator yang benar. Ledger memuat referensi penghapusan, bukan isi jurnal. Mode kunci lama harus tersedia dalam keyring untuk membuka backup/ledger lama. Bila ledger terbaru tidak tersedia pada pemulihan total, jangan membuka akses data hasil restore sampai daftar penghapusan direkonsiliasi oleh operator. Jadwal backup, ledger dan masa simpan 30 hari perlu dikelola pada infrastruktur deployment; CLI ini tidak mengklaim menyediakan penyimpanan luar secara otomatis.

Uji restore harus memakai database test terisolasi. Perintah backup:verify melakukan restore pada database yang dikonfigurasi, sehingga memerlukan penghentian API/worker dan tidak boleh dijalankan sembarangan pada pilot.

## Worker production dengan role terpisah

Isi WORKER_DATABASE_URL menggunakan role worker yang memiliki hak DML pada tabel aplikasi dan USAGE/CREATE pada schema pgboss. DATABASE_ADMIN_URL hanya disediakan kepada proses migrasi/bootstrap operator. Jalankan npm run db:migrate:production sebelum worker; pemasangan/migrasi pg-boss dilakukan pada tahap tersebut. Role operator harus merupakan pemilik database atau memiliki hak memberikan/mencabut izin CREATE database saat pemasangan pertama. Role worker bukan superuser, tidak dapat membuat database/role, dan tidak mempertahankan izin CREATE pada database. Jalankan npm run worker:production dengan DATABASE_ADMIN_URL kosong.
