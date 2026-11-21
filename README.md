# TENANGIN.ID

> **Deploy manual ke Vercel:** gunakan root repository, Node.js 24.x, build `npm run build`, dan output `frontend/dist`. Frontend dan API memakai satu domain. Langkah database, environment, Superadmin awal, dan worker tersedia di [panduan Vercel](./docs/VERCEL_DEPLOY.md). Konfigurasi ini tidak menjalankan deployment otomatis.

> **Akses dashboard siswa:** ruang layanan ini memakai persetujuan akun Superadmin untuk membuka fitur utama, tanpa tahapan kebijakan tambahan. Panduan produk tersedia tanpa aktivitas dummy. Lihat [alur dashboard dan pengaturan akses](./docs/STUDENT_DASHBOARD.md).

Website Manajemen Stres Akademik dan Regulasi Emosi untuk Siswa SMA/MA kelas X–XI, dengan pemisahan peran server-side untuk **Siswa (`student`)**, **Guru BK (`bk` — pemantauan read-only)**, dan **Superadmin (`superadmin` — kendali penuh teraudit)**.

> **Persiapan production:** UI publik memakai tampilan layanan tanpa label demo atau pintasan akun uji. Profil production terpisah tersedia di `backend/.env.production.example`; rilis data nyata tetap memerlukan konfigurasi resmi dan pengesahan sekolah/ahli. Lihat [panduan production](./docs/PRODUCTION_SETUP.md).

## Arsitektur & Folder Utama

- `backend/` — Express ESM REST API, PostgreSQL + Knex migrations, sesi server (`express-session` + `connect-pg-simple`), Argon2id (`argon2`), MFA TOTP (`otplib`), synchronizer CSRF (`csrf-sync`), enkripsi data terbatas AES-256-GCM (`node:crypto`), dan worker terjadwal (`pg-boss`).
- `frontend/` — React + Vite (JavaScript ESM), React Router, TanStack Query, CSS Modules + CSS custom properties (`tokens.css`), `@fontsource/plus-jakarta-sans`, dan `lucide-react` tanpa ketergantungan CDN eksternal.
- `docs/` — Dokumentasi audit Stitch (`docs/audit/stitch-audit.md`), kontrak API (`docs/api/openapi.yaml`), panduan pengguna, runbook operasi, dan daftar keterbatasan.
- `stitch_tenangin_prototype_platform/` — Ekspor referensi Stitch asli (dipertahankan utuh).

## Prasyarat

- Node.js `>= 22` (teruji pada Node.js `v24.21.0`) & npm `>= 10`
- PostgreSQL `15+` (lokal terisolasi via `npm run pg:init` menggunakan biner PostgreSQL 15 atau koneksi PostgreSQL eksternal via `backend/.env`)

## Cara Menjalankan dari Checkout Baru

1. **Instal seluruh dependency workspace dari root:**
   ```bash
   npm install
   ```
2. **Siapkan PostgreSQL lokal (opsional jika belum punya server PostgreSQL khusus) & file `.env`:**
   ```bash
   npm run pg:init
   ```
   Perintah ini membuat klaster lokal terisolasi di `.local/pgdata` pada port `5433`, membuat role `tenangin_admin` (DDL) & `tenangin_app` (DML-only), membuat database kosong `tenangin_production` & database pengujian terpisah `tenangin_test`, serta menghasilkan `backend/.env` dengan secret acak lokal.
3. **Jalankan migrasi pada database aplikasi kosong:**
   ```bash
   npm run db:migrate
   ```
4. **Siapkan Superadmin menggunakan identitas pengelola resmi sesuai [panduan production](./docs/PRODUCTION_SETUP.md). Tidak tersedia akun atau sandi bawaan. Kemudian jalankan API backend dan frontend Vite:**
   ```bash
   npm run dev:backend
   npm run dev:worker
   npm run dev:frontend
   ```
   Buka `http://127.0.0.1:5173`.

## Perintah Verifikasi

- `npm run lint` — ESLint pada workspace `backend` dan `frontend`.
- `npm test` — Unit & integrasi Vitest + Supertest (`backend`) serta React Testing Library (`frontend`).
- `npm run build` — Build produksi Vite ke `frontend/dist/`.
- `npm run test:e2e` — Playwright menyalakan server test terisolasi (API 3001, Vite 5174), mereset fixture sebelum setiap skenario dan menghentikan server setelah selesai. Database lokal `tenangin_test` wajib sudah dimigrasikan; tidak memakai demo/pilot.
- `npm run backup:verify --workspace backend` — Uji ekspor backup terenkripsi AES-256-GCM & restore dengan penerapan ulang tombstone penghapusan.
- `npm run capacity:check --workspace backend` — Uji rencana kueri berindeks & burst beban pada pool PostgreSQL (`L05`).

## Dokumen Pendukung

- [Fixture & Skenario Pengujian Terisolasi](./docs/DEMO_ACCOUNTS.md)
- [Panduan Pengguna Siswa, BK, dan Superadmin](./docs/USER_GUIDES.md)
- [Runbook Operasi, Backup/Restore, dan Rollback](./docs/OPERATIONS_RUNBOOK.md)
- [Paket Tinjauan Ahli & Pengelola Sekolah (T73)](./docs/REVIEW_PACK_T73.md)
- [Keterbatasan, Gerbang Pilot, & Daftar Tinjauan Ahli (T73)](./docs/LIMITATIONS_AND_REVIEW.md)
- [Audit Ekspor Stitch](./docs/audit/stitch-audit.md)
- [Kontrak OpenAPI](./docs/api/openapi.yaml)


## Verifikasi setelah perbaikan audit

Sebelum menjalankan tes dari checkout baru:

```bash
npm run db:migrate --workspace backend -- --env test
npx playwright install chromium
npm test
npm run test:e2e
npm run lint
npm run build
```

E2E memakai port 3001/5174 dan memerlukan TEST_DATABASE_URL/TEST_APP_DATABASE_URL yang mengarah ke database lokal tenangin_test. Fixture menolak mereset database lain. Jangan menjalankan npm test bersamaan dengan E2E karena keduanya menggunakan database test yang sama. PostgreSQL lokal dapat disiapkan dengan pg:init sesuai langkah setup di atas.

Acuan aktif: PRD v1.1, design v2.1, structure v1.2 dan TASKLIST. Dokumen v1.0 sebelum implementasi berada di docs/archive untuk keterlacakan. BK read-only; Superadmin mengelola domain yang diizinkan dengan audit, sesuai informasi persetujuan. Pilot data nyata tetap menunggu review T73.

Seed hanya tersedia melalui `npm run db:seed:test`, membutuhkan `NODE_ENV=test`, serta selalu memverifikasi koneksi database test sebelum menulis. Akun, persetujuan, materi, dan instrumen tidak dibuat otomatis pada database aplikasi. `APP_MODE=pilot` dan `ALLOW_DEMO_SEED=false` adalah default runtime.

Keputusan pengelola 20 November 2026: aktivasi token publik diganti pendaftaran siswa dan persetujuan melalui dashboard Superadmin. Lihat docs/STUDENT_REGISTRATION.md. Siswa belum dapat masuk sebelum disetujui; persetujuan data pribadi tetap terpisah.
