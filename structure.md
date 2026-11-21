# TENANGIN.ID — Struktur dan Stack

| Atribut | Keputusan |
| --- | --- |
| Versi / tanggal | 1.2 / 20 November 2026 |
| Status | Implementasi demo; pilot menunggu gerbang PRD/T73 |
| Bahasa / workspace | JavaScript ESM, npm workspaces backend dan frontend |
| Frontend | React + Vite, React Router, TanStack Query, React Hook Form/Zod, CSS Modules |
| Backend | Node.js >=22, Express, PostgreSQL, Knex/pg, Passport, pg-boss |
| Acuan | PRD.md v1.1, design.md v2.1, TASKLIST.md, ADR 001 |

Ini merupakan struktur aktif, menggantikan rencana sebelum scaffold pada v1.0. Arsip berada di docs/archive/structure-v1.0.md. Versi dependency aktual tercatat pada package-lock.json; jangan menafsirkan dokumen arsip sebagai kontrak aktif.

## 1. Batas aplikasi

Browser -> frontend (cookie sesi dan CSRF dalam memori) -> /api Express -> policy peran/sekolah/pemilik/penugasan/persetujuan -> PostgreSQL. Worker terpisah menjalankan agregasi, retensi dan penghapusan. API tetap memeriksa seluruh izin; guard React hanya mengatur navigasi.

Role server: student, bk, superadmin. BK read-only untuk bisnis; operasi auth sendiri tetap tersedia. Superadmin memakai namespace /api/superadmin, audit baca/mutasi, dan batas satu sekolah. Informasi persetujuan menyatakan akses isi pribadi. Jawaban skrining dan sesi latihan asli tidak dibuat atas nama siswa oleh Superadmin.

## 2. Susunan folder aktif

```text
backend/
  database/migrations/       # skema dan perubahan durasi snapshot sesi
  database/seeds/            # fixture demo dengan guard
  database/fixtures/         # skrining simulasi
  scripts/                  # PostgreSQL lokal, provisioning, backup/restore
  src/
    app.js, server.js, worker.js
    config/                 # env tervalidasi, DB, session, Passport, headers
    middleware/             # auth, MFA, role, consent, CSRF, input, error, no-store
    policies/               # ownership, school, assignment, eligibility, suppression
    modules/                # auth, consent, privacy, mood, screening, journals,
                            # exercises, planner, reminders, reflections, library,
                            # help-requests, feedback, dashboard, superadmin, audit
      superadmin/content.routes.js         # editorial + audit atomik
      superadmin/student-records.routes.js # CRUD domain yang diizinkan
    jobs/handlers/          # aggregate-weekly, cleanup-retention, delete-account
    lib/                    # crypto, validation, time, response, logger
  tests/unit/, tests/integration/, tests/setup/
frontend/
  src/
    app/                    # provider Query + data router + Auth, routes
    pages/public/           # D01, D06
    pages/auth/             # D09 dan state akses inline
    pages/student/          # D02–D05
    pages/counselor/         # D07
    pages/superadmin/        # D08
    features/auth/          # state sesi minimal
    features/superadmin/    # akun/penugasan, data/editor, konten/editor, bantuan,
                            # pengaturan/audit
    components/ui/          # kontrol bersama dan dialog fokus-terkelola
    components/states/      # loading, error, offline, expired, unauthorized, suppressed
    components/navigation/  # panel akun
    layouts/, guards/, lib/, styles/, assets/
  tests/e2e/                # alur role, resilience, regresi audit
  src/test/                 # tes komponen
```

Detail halaman/fitur sesuai inventaris sembilan halaman design.md; alur kecil tetap inline. Logic domain siswa yang masih menyatu di file routes/halaman dapat diekstrak bila diperlukan, tanpa mengklaim folder fitur terpisah sudah tersedia.

## 3. Kontrak data dan keamanan

- Sesi PostgreSQL, cookie HttpOnly/SameSite dan Secure produksi, rotasi sesi, MFA staf, CSRF synchronizer, Argon2id, AES-256-GCM keyring.
- Data pribadi tidak dipersist frontend/localStorage; logout membatalkan request dan membersihkan cache. Query pribadi menyertakan ID pengguna/objek. API sensitif no-store.
- Persetujuan aktif, scope, izin wali dan akun aktif ditegakkan pada fungsi pribadi serta eligibility agregat/metadata BK. Tidak ada kebijakan aktif berarti tidak ada kontributor.
- Snapshot setelah minggu kalender selesai; k=5, supresi sekunder, invalidasi saat kebijakan/izin/data berubah. Rekaman yang sudah dihapus tidak dihidupkan saat restore.
- Restore mempertahankan ledger terbaru dari database sebelum mengganti tabel, menerapkan penghapusan akun/entri dan mencabut sesi. Pemulihan total ke DB kosong memerlukan ledger eksternal terbaru sesuai runbook.
- Retensi membersihkan aktivitas pribadi lama, bantuan tertutup dan log sesuai PRD. Seluruh mutasi konten dan CRUD Superadmin mencatat aktor melalui audit.
- Zona waktu IANA dan input domain divalidasi server. Konten yang berubah kembali ke draf, versi naik, review lama dicabut. Sesi menyimpan versi serta durasi latihan saat mulai.

## 4. Konfigurasi dan menjalankan

Frontend hanya menggunakan VITE_API_BASE_URL=/api. Backend memvalidasi DATABASE_URL, SESSION_SECRET, APP_ORIGIN, ENCRYPTION_KEY/ID, APP_MODE, serta opsi runtime. Secret tidak masuk frontend/repo. Mode demo/test/pilot memakai DB dan kunci terpisah; seed tidak boleh berjalan pada pilot.

README.md memuat setup. Development: Vite 127.0.0.1:5173 -> proxy API 3000. Produksi satu origin, TLS/reverse proxy eksplisit, SPA fallback hanya untuk halaman; API 404 tetap JSON. Worker dikelola terpisah.

| Root script | Fungsi |
| --- | --- |
| dev:frontend / dev:backend / dev:worker | Proses lokal |
| build / lint / test / test:e2e | Build dan pemeriksaan |
| db:migrate / db:seed:demo | Migrasi dan seed ber-guard |
| pg:init / pg:start / pg:stop / pg:status | PostgreSQL lokal terisolasi |

Migrasi test: npm run db:migrate --workspace backend -- --env test. Tes integrasi hanya boleh menyentuh database test. E2E menyalakan API 3001 dan Vite 5174 terisolasi, menyiapkan ulang fixture per skenario, lalu menghentikan server; instruksi rinci di README. Tidak menjalankan tes restore pada database pilot.

## 5. Status penerimaan

TASKLIST mencatat bukti aktual, bukan sekadar keberadaan file. Tes regresi mencakup restore ledger, retensi, consent/guardian/scope, MFA paralel, editorial, CRUD serta navigasi draf/responsivitas. T73 tetap membutuhkan tinjauan manusia; kesesuaian teknis tidak menggantikan izin pilot atau bukti efektivitas.
