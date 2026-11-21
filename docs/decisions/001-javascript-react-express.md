# ADR 001: JavaScript ESM, React + Vite, Express, dan PostgreSQL

- **Status:** Diterima
- **Tanggal:** 20 November 2026
- **Konteks:** `PRD.md` Bagian 11 awalnya mengusulkan Next.js + TypeScript sebagai salah satu opsi teknis. Keputusan proyek pada `design.md` v2.1 dan `structure.md` menetapkan pemakaian **JavaScript (ES Modules)** dengan pemisahan dua folder utama: `frontend/` (React + Vite) dan `backend/` (Node.js + Express + PostgreSQL + Knex + pg-boss).
- **Keputusan:**
  1. Menggunakan npm workspaces di root (`backend` dan `frontend`) dengan satu `package-lock.json`.
  2. Seluruh aplikasi ditulis dalam JavaScript ESM (`"type": "module"`), `.jsx` untuk komponen React, dan `.js` untuk logika/konfigurasi/migrasi.
  3. Otorisasi dan kepemilikan ditegakkan penuh di backend Express pada setiap endpoint, didukung sesi server PostgreSQL (`connect-pg-simple`), Argon2id (`argon2`), TOTP MFA staf (`otplib`), synchronizer CSRF (`csrf-sync`), dan enkripsi AES-256-GCM (`node:crypto`) untuk data pribadi terbatas.
  4. Styling frontend memakai CSS Modules dan CSS custom properties tanpa ketergantungan CDN eksternal.
- **Konsekuensi:** Batas privasi, matriks peran (`student`, `bk`, `superadmin`), audit trail Superadmin, supresi agregasi `k = 5`, serta seluruh acceptance criteria F1-F9 diuji langsung pada layer API dan UI.
