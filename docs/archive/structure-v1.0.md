> ARSIP HISTORIS v1.0 — tidak berlaku sebagai acuan implementasi aktif. Gunakan dokumen bernama sama pada root proyek.

# TENANGIN.ID - Struktur Folder dan Tech Stack

| Atribut               | Keputusan                                                    |
| --------------------- | ------------------------------------------------------------ |
| Versi / tanggal       | 1.0 / 20 November 2026                                       |
| Folder utama aplikasi | `backend/` dan `frontend/`                                   |
| Bahasa                | JavaScript dengan ES Modules                                 |
| Frontend              | React + Vite                                                 |
| Backend               | Node.js + Express                                            |
| Database              | PostgreSQL                                                   |
| Acuan                 | [PRD.md](./PRD.md) dan [design.md](./design.md)              |
| Status                | Rancangan struktur, belum scaffold atau instalasi dependency |

Dokumen ini mengikuti arahan terbaru untuk menggunakan **JavaScript dan React**. Keputusan teknis di sini menggantikan usulan Next.js + TypeScript pada PRD Bagian 11. Kebutuhan produk, privasi, hak akses, dan layout tetap mengikuti PRD serta design.md.

## 1. Arsitektur

- **`frontend/`:** aplikasi React untuk publik, siswa, guru BK, dan admin.
- **`backend/`:** HTTP API, autentikasi, izin, logika bisnis, database, dan worker terjadwal.

```text
Browser
   |
   v
frontend/ - React + Vite
   |
   | HTTP /api + cookie sesi
   v
backend/ - Node.js + Express
   |
   +--> PostgreSQL: data, sesi, antrean job
   +--> Aset publik: ilustrasi/materi/audio terbit
   +--> Worker: agregasi mingguan, retensi, penghapusan
```

Backend berupa satu aplikasi yang dibagi per fitur. Worker menggunakan kode backend yang sama dengan entry point terpisah. Otorisasi berada di server; guard React mengatur navigasi.

Frontend menggunakan SPA pada tahap awal. Halaman publik tetap memiliki URL, judul, deskripsi, dan struktur semantik. Kebutuhan prerender/SSR untuk konten publik kelak dievaluasi sebagai perubahan arsitektur.

## 2. Tech stack

### 2.1 Frontend

| Kebutuhan        | Teknologi                           | Fungsi                               |
| ---------------- | ----------------------------------- | ------------------------------------ |
| UI               | `react` + `react-dom`               | Komponen dan halaman                 |
| Build/dev server | `vite` + `@vitejs/plugin-react`     | Development dan build aset           |
| Routing          | `react-router`                      | Rute publik, siswa, guru, admin      |
| Server state     | `@tanstack/react-query`             | Fetch, loading/error, invalidasi     |
| HTTP             | Browser `fetch`                     | Wrapper API, cookie, CSRF, error     |
| Form             | `react-hook-form`                   | Input, submit, error, dirty state    |
| Validasi         | `zod` + `@hookform/resolvers`       | Validasi UX; server tetap otoritatif |
| Styling          | CSS Modules + CSS custom properties | Komponen dan tokens design.md        |
| State lokal      | React hooks + Context seperlunya    | Menu dan profil sesi minimal         |

Vite merupakan salah satu build tool yang didokumentasikan React untuk aplikasi yang disusun sendiri. Pemisahan SPA/API dipilih sesuai dua folder yang diminta. [React](https://react.dev/learn/build-a-react-app-from-scratch), [Vite](https://vite.dev/guide/).

Routing menggunakan mode SPA yang dipilih saat implementasi. Server state dipusatkan pada Query, form pada React Hook Form, dan skema pada Zod yang mendukung JavaScript biasa. [React Router](https://reactrouter.com/start/declarative/installation), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview), [React Hook Form](https://react-hook-form.com/get-started), [Zod](https://zod.dev/).

Gaya lokal memakai `.module.css`; tokens global menggunakan CSS variables. [Vite CSS Modules](https://vite.dev/guide/features#css-modules).

### 2.2 Backend dan database

| Kebutuhan        | Teknologi                               | Fungsi                                      |
| ---------------- | --------------------------------------- | ------------------------------------------- |
| Runtime          | Node.js LTS yang masih didukung         | API dan worker JavaScript                   |
| HTTP server      | `express`                               | Route dan middleware                        |
| Database         | PostgreSQL                              | Relasi, constraint, transaksi               |
| Query/migration  | `knex` + `pg`                           | Query builder, driver, migration JavaScript |
| Validasi         | `zod`                                   | Request dan environment                     |
| Autentikasi      | `passport` + `passport-local`           | Kode akun dan kata sandi                    |
| Sesi             | `express-session` + `connect-pg-simple` | Sesi server dalam PostgreSQL                |
| Password hashing | `argon2`, mode Argon2id                 | Hash/verifikasi melalui pustaka             |
| MFA staf         | `otplib`                                | TOTP guru/admin                             |
| CSRF             | `csrf-sync`                             | Synchronizer token untuk mutasi             |
| Header keamanan  | `helmet`                                | Header HTTP sesuai konfigurasi              |
| Rate limit       | `express-rate-limit`                    | Login, pemulihan, endpoint sensitif         |
| Job queue        | `pg-boss`                               | Jadwal/retry/worker berbasis PostgreSQL     |
| Enkripsi         | `node:crypto` + kunci terpisah          | Enkripsi terautentikasi lewat API standar   |

Server memakai Express dan akses database memakai Knex dengan driver PostgreSQL. [Express](https://expressjs.com/), [Knex](https://knexjs.org/guide/), [node-postgres](https://node-postgres.com/).

Passport Local menangani kredensial; express-session dan PostgreSQL session store menangani sesi. Cookie memuat ID sesi, sementara data sesi berada di server. [Passport Local](https://www.passportjs.org/packages/passport-local/), [Passport Sessions](https://www.passportjs.org/concepts/authentication/sessions/), [express-session](https://expressjs.com/en/resources/middleware/session/), [connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple).

Hash, TOTP, dan CSRF memakai pustaka; alur enrollment, pemulihan, dan revokasi tetap dibangun serta diuji. [Argon2](https://github.com/ranisalt/node-argon2), [otplib](https://github.com/yeojz/otplib), [csrf-sync](https://github.com/Psifi-Solutions/csrf-sync).

Job memakai pg-boss dengan handler idempoten saat retry. Header keamanan dan pembatasan request dikonfigurasi sesuai deployment. [pg-boss](https://pgboss.io/), [Helmet](https://helmet.js.org/), [express-rate-limit](https://express-rate-limit.mintlify.app/overview).

### 2.3 Tooling

| Area                      | Pilihan                             |
| ------------------------- | ----------------------------------- |
| Workspace/package manager | npm workspaces                      |
| Format/lint               | Prettier + ESLint                   |
| Unit/component frontend   | Vitest + React Testing Library      |
| Unit/integrasi backend    | Vitest + Supertest + database test  |
| E2E browser               | Playwright                          |
| Kontrak API               | OpenAPI di `docs/api/openapi.yaml`  |
| Editor                    | `.editorconfig` dan `jsconfig.json` |

Uji mengikuti risiko PRD: persetujuan, izin, penyimpanan, bantuan, skoring fixture, agregasi, dan penghapusan. [Vitest](https://vitest.dev/guide/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Supertest](https://github.com/forwardemail/supertest), [Playwright](https://playwright.dev/docs/intro).

### 2.4 Bahasa dan versi

- UI memakai `.jsx`; logika/config/migration memakai `.js`.
- Paket aplikasi menggunakan `"type": "module"` dengan `import/export`.
- Markdown, CSS, JSON, YAML, SQL tetap dapat digunakan untuk dokumen/config/database.
- Gunakan JSDoc untuk menjelaskan bentuk objek penting.
- Versi stabil kompatibel dikunci saat bootstrap. Node dicatat di `.nvmrc`/`engines` dan dependency di lockfile root.
- Periksa kompatibilitas Node, Vite, Express, PostgreSQL, pg-boss, dan paket native Argon2. [Node.js Releases](https://nodejs.org/en/about/previous-releases).

## 3. Struktur root

```text
TENANGIN.ID/
|-- backend/                  # Kode server dan worker
|-- frontend/                 # Kode React
|-- docs/
|   |-- references/           # Referensi visual yang sudah tersedia
|   |-- api/
|   |   +-- openapi.yaml
|   +-- decisions/
|       +-- 001-javascript-react-express.md
|-- PRD.md
|-- design.md
|-- structure.md
|-- README.md
|-- package.json              # Private; workspaces backend dan frontend
|-- package-lock.json         # Satu lockfile root
|-- .gitignore
|-- .editorconfig
|-- .nvmrc
+-- .prettierrc.json
```

Dua folder utama **kode aplikasi** adalah backend dan frontend; dokumen/referensi yang sudah ada dipertahankan. Pohon ini merencanakan file implementasi mendatang, bukan daftar file yang semuanya telah dibuat.

Contoh workspace root:

```json
{
  "name": "tenangin-id",
  "private": true,
  "workspaces": ["backend", "frontend"]
}
```

Setiap workspace mempunyai `package.json` sendiri; instalasi dari root mengelola satu lockfile.

## 4. Struktur backend

```text
backend/
|-- src/
|   |-- app.js                      # Susun Express tanpa listen
|   |-- server.js                   # HTTP dan graceful shutdown
|   |-- worker.js                   # Entry point worker
|   |-- config/
|   |   |-- env.js
|   |   |-- database.js
|   |   |-- passport.js
|   |   |-- session.js
|   |   +-- security.js
|   |-- routes/
|   |   +-- index.js                # Mount router /api
|   |-- middleware/
|   |   |-- authenticate.middleware.js
|   |   |-- require-mfa.middleware.js
|   |   |-- authorize.middleware.js
|   |   |-- require-consent.middleware.js
|   |   |-- csrf.middleware.js
|   |   |-- validate.middleware.js
|   |   |-- rate-limit.middleware.js
|   |   |-- request-context.middleware.js
|   |   +-- error-handler.middleware.js
|   |-- modules/
|   |   |-- auth/                   # Aktivasi, login, MFA, recovery, logout
|   |   |-- users/                  # Akun/admin
|   |   |-- schools/                # Sekolah dan kontak
|   |   |-- assignments/            # Penugasan guru
|   |   |-- consent/                # F1
|   |   |-- mood/                   # F2 mood
|   |   |-- screening/              # F2 instrumen/skoring berversi
|   |   |-- journals/               # F3
|   |   |-- exercises/              # F4 materi dan sesi
|   |   |-- planner/                # F5 tugas, langkah, jadwal
|   |   |-- reminders/              # F6 preferensi
|   |   |-- reflections/            # F7
|   |   |-- library/                # F8 materi publik terbit
|   |   |-- help-requests/          # F9 bantuan/status
|   |   |-- feedback/               # F9 pesan kelompok
|   |   |-- dashboard/              # F9 agregat aman
|   |   |-- content/                # Draft/review/publish
|   |   |-- privacy/                # Penarikan/penghapusan
|   |   +-- audit/                  # Peristiwa tersanitasi
|   |-- jobs/
|   |   |-- boss.js
|   |   |-- register-jobs.js
|   |   +-- handlers/
|   |       |-- aggregate-weekly.job.js
|   |       |-- cleanup-retention.job.js
|   |       +-- delete-account.job.js
|   |-- policies/
|   |   |-- ownership.policy.js
|   |   |-- school-access.policy.js
|   |   |-- help-assignment.policy.js
|   |   +-- aggregate-privacy.policy.js
|   +-- lib/
|       |-- errors.js
|       |-- response.js
|       |-- time.js
|       |-- encryption.js
|       |-- password.js
|       |-- logger.js
|       +-- idempotency.js
|-- database/
|   |-- migrations/                # Migration .js
|   |-- seeds/                     # Data demo
|   +-- fixtures/                  # Data uji/instrumen simulasi
|-- tests/
|   |-- setup/
|   |-- unit/
|   +-- integration/
|-- scripts/
|   +-- bootstrap-admin.js         # Provision melalui operator berwenang
|-- knexfile.js
|-- vitest.config.js
|-- eslint.config.js
|-- package.json
|-- .env.example
+-- README.md
```

### 4.1 Pola modul

```text
modules/journals/
|-- journals.routes.js
|-- journals.controller.js
|-- journals.service.js
|-- journals.repository.js
|-- journals.schema.js
+-- journals.presenter.js
```

| File              | Tanggung jawab                                     |
| ----------------- | -------------------------------------------------- |
| `*.routes.js`     | Endpoint, middleware, controller                   |
| `*.controller.js` | Request tervalidasi, panggil service, respons HTTP |
| `*.service.js`    | Domain, izin objek, transaksi, orkestrasi          |
| `*.repository.js` | Query dalam scope sekolah/pemilik                  |
| `*.schema.js`     | Zod untuk params, query, body                      |
| `*.presenter.js`  | Allowlist field respons                            |

Tambahkan subfolder seperti `screening/scoring/` sesuai kebutuhan. File sederhana boleh digabung selama tanggung jawab jelas; tidak perlu membuat file kosong untuk memenuhi pohon.

### 4.2 Alur request dan pekerjaan terjadwal

```text
Route -> konteks/sesi -> CSRF/rate limit sesuai operasi
      -> autentikasi/MFA -> izin peran/persetujuan
      -> validasi -> controller -> service + policy
      -> repository -> PostgreSQL -> presenter -> JSON
```

- Endpoint publik tetap terbuka tanpa login/izin data pribadi.
- MFA menggunakan sesi sementara terbatas; lulus sandi belum membuka akses staf penuh.
- Identitas sekolah/pemilik diturunkan server dari sesi/config sah, bukan body.
- Entitas mengikuti PRD Bagian 12, ditambah tabel sesi/MFA/recovery dan antrean.
- Constraint unik mencakup mood per tanggal, refleksi per minggu, idempotensi bantuan.
- Seed demo memeriksa mode/database tujuan.
- Dashboard membaca snapshot aman; pengolahan sumber hanya lewat service/job internal.
- Job agregat dideduplikasi menurut sekolah/periode/versi rumus.
- Payload job hanya ID, tanpa teks jurnal/jawaban/pesan.
- Job hapus membersihkan relasi, mencabut sesi, menginvalidasi agregat, mencatat bukti minimal.
- Status akun/izin diperiksa aktual agar penonaktifan tidak menunggu cache sesi kedaluwarsa.

## 5. Struktur frontend

```text
frontend/
|-- public/
|   |-- favicon.svg
|   +-- images/                    # Hanya aset yang boleh tersedia publik
|-- src/
|   |-- main.jsx
|   |-- app/
|   |   |-- App.jsx
|   |   |-- router.jsx
|   |   |-- providers.jsx
|   |   +-- query-client.js
|   |-- assets/
|   |   |-- illustrations/
|   |   |-- icons/
|   |   +-- fonts/
|   |-- layouts/
|   |   |-- PublicLayout.jsx
|   |   |-- AuthLayout.jsx
|   |   |-- StudentLayout.jsx
|   |   |-- CounselorLayout.jsx
|   |   +-- AdminLayout.jsx
|   |-- pages/
|   |   |-- public/                # Landing, Pustaka, Article, Help
|   |   |-- auth/                  # Login, Activate, Recovery, Consent, MFA
|   |   |-- student/               # Aktivitas pribadi
|   |   |-- counselor/             # Ringkasan, antrean, detail, feedback
|   |   |-- admin/                 # Akun, undangan, penugasan, konten, sekolah
|   |   |-- development/           # ComponentGallery; khusus development/demo
|   |   +-- NotFoundPage.jsx
|   |-- features/
|   |   |-- auth/
|   |   |-- consent/
|   |   |-- mood/
|   |   |-- screening/
|   |   |-- journals/
|   |   |-- exercises/
|   |   |-- planner/
|   |   |-- reminders/
|   |   |-- reflections/
|   |   |-- library/
|   |   |-- help-requests/
|   |   |-- feedback/
|   |   |-- dashboard/
|   |   |-- accounts/
|   |   |-- assignments/
|   |   |-- content/
|   |   |-- school-settings/
|   |   +-- privacy/
|   |-- components/
|   |   |-- ui/                    # Button, Input, Dialog, Card, Status
|   |   |-- navigation/            # Sidebar, BottomTabs, Header, HelpAction
|   |   +-- states/                # Loading, Empty, Error, SuppressedData
|   |-- guards/
|   |   |-- RequireAuth.jsx
|   |   |-- RequireRole.jsx
|   |   |-- RequireMfa.jsx
|   |   +-- RequireConsent.jsx
|   |-- hooks/                     # Hooks umum lintas fitur
|   |-- lib/
|   |   |-- api-client.js
|   |   |-- api-error.js
|   |   +-- date-format.js
|   |-- styles/
|   |   |-- tokens.css
|   |   |-- reset.css
|   |   +-- globals.css
|   |-- mocks/                     # Fixture/adapter demo terisolasi
|   |   |-- fixtures/
|   |   +-- demo-api.js
|   +-- test/
|       +-- setup.js
|-- tests/
|   +-- e2e/
|-- index.html
|-- vite.config.js
|-- vitest.config.js
|-- playwright.config.js
|-- eslint.config.js
|-- jsconfig.json
|-- package.json
|-- .env.example
+-- README.md
```

### 5.1 Pola halaman dan fitur

`pages/` berisi komponen yang terhubung ke router; `features/` berisi UI domain, form, hooks data, dan API. Halaman tidak digandakan di kedua folder.

```text
pages/student/JournalEditorPage.jsx

features/journals/
|-- components/
|   |-- JournalForm.jsx
|   |-- JournalForm.module.css
|   +-- JournalCard.jsx
|-- hooks/
|   |-- use-journals.js
|   +-- use-save-journal.js
|-- journals.api.js
|-- journals.schema.js
+-- journals.test.jsx
```

Alur: `JournalEditorPage -> JournalForm -> useSaveJournal -> journals.api -> api-client -> backend`. Nama fungsi hook tetap camelCase seperti `useSaveJournal`.

`components/ui/` tidak mengetahui endpoint/peran. Halaman Pustaka/Artikel dapat memakai komponen isi yang sama pada shell publik dan siswa.

### 5.2 State dan privasi

- Query mengelola data server, React Hook Form mengelola form, React mengelola state visual lokal.
- `AuthProvider` dalam fitur auth menyimpan profil sesi minimal, bukan kata sandi/token rahasia.
- Key query pribadi menyertakan konteks akun/sekolah. Logout membatalkan request aktif dan membersihkan cache pribadi.
- Jurnal, refleksi, jawaban, kontak bantuan, token sesi tidak dipersist ke localStorage atau service worker.
- API wrapper menyertakan cookie sesi, menangani token CSRF dalam memori, menormalisasi error.
- Guard memisahkan navigasi per peran dan persetujuan; backend tetap memverifikasi semua izin.
- Fixture demo tidak diimpor ke jalur pilot. Flag UI tidak dapat mengubah otorisasi atau mode database server.
- State loading, kosong, error, offline, sesi habis, dan data tersupresi memakai komponen yang konsisten.

## 6. Pemetaan fitur dan halaman

### 6.1 Fitur PRD ke modul

| Fitur             | Frontend `features/`                     | Backend `modules/`                       |
| ----------------- | ---------------------------------------- | ---------------------------------------- |
| F1 Persetujuan    | `consent`, `privacy`                     | `consent`, `privacy`                     |
| F2 Mood/skrining  | `mood`, `screening`                      | `mood`, `screening`                      |
| F3 Jurnal         | `journals`                               | `journals`                               |
| F4 Latihan        | `exercises`                              | `exercises`                              |
| F5 Perencana      | `planner`                                | `planner`                                |
| F6 Pengingat      | `reminders`                              | `reminders`                              |
| F7 Refleksi       | `reflections`                            | `reflections`                            |
| F8 Pustaka        | `library`                                | `library`, `content`                     |
| F9 Bantuan/dasbor | `help-requests`, `dashboard`, `feedback` | `help-requests`, `dashboard`, `feedback` |
| Akun/penugasan    | `auth`, `accounts`, `assignments`        | `auth`, `users`, `assignments`           |
| Konten/sekolah    | `content`, `school-settings`             | `content`, `schools`                     |

### 6.2 Layar design.md ke file halaman

File pada kolom kanan berada di `frontend/src/pages/`. State seperti error/jeda/kosong adalah varian komponen, bukan file halaman baru secara otomatis.

| ID  | File halaman                                            |
| --- | ------------------------------------------------------- |
| L01 | `public/LandingPage.jsx`                                |
| A01 | `auth/LoginPage.jsx`                                    |
| A02 | `auth/ActivationPage.jsx`                               |
| A03 | `auth/RecoveryPage.jsx`                                 |
| A04 | `auth/ConsentPage.jsx`                                  |
| A05 | `auth/MfaPage.jsx`                                      |
| S01 | `student/HomePage.jsx`                                  |
| S02 | `student/MoodPage.jsx`                                  |
| S03 | `student/ScreeningIntroPage.jsx`                        |
| S04 | `student/ScreeningQuestionPage.jsx`                     |
| S05 | `student/ScreeningResultPage.jsx`                       |
| S06 | `student/ExercisesPage.jsx`                             |
| S07 | `student/ExercisePlayerPage.jsx`                        |
| S08 | `student/ExerciseCompletePage.jsx`                      |
| S09 | `student/JournalsPage.jsx`                              |
| S10 | `student/JournalEditorPage.jsx`                         |
| S11 | `student/PlannerPage.jsx`                               |
| S12 | `student/TaskEditorPage.jsx`                            |
| S13 | `student/ReflectionsPage.jsx`                           |
| S14 | `public/LibraryPage.jsx`, dipakai juga pada shell siswa |
| S15 | `public/ArticlePage.jsx`, dipakai juga pada shell siswa |
| S16 | `student/RemindersPage.jsx`                             |
| S17 | `student/SettingsPage.jsx`                              |
| H01 | `public/HelpPage.jsx`                                   |
| H02 | `student/HelpRequestPage.jsx`                           |
| H03 | `student/HelpPreviewPage.jsx`                           |
| H04 | `student/HelpStatusPage.jsx`                            |
| B01 | `counselor/DashboardPage.jsx`                           |
| B02 | `counselor/HelpQueuePage.jsx`                           |
| B03 | `counselor/HelpDetailPage.jsx`                          |
| B04 | `counselor/FeedbackPage.jsx`                            |
| N01 | `admin/AccountsPage.jsx`                                |
| N02 | `admin/InvitationsPage.jsx`                             |
| N03 | `admin/AssignmentsPage.jsx`                             |
| N04 | `admin/ContentListPage.jsx`                             |
| N05 | `admin/ContentEditorPage.jsx`                           |
| N06 | `admin/SchoolSettingsPage.jsx`                          |
| V01 | `development/ComponentGalleryPage.jsx`                  |

Galeri V01 didaftarkan hanya dalam development/demo yang memang memerlukannya, tidak sebagai halaman administrasi produksi.

### 6.3 Rute dan API

| Area        | Contoh URL frontend                           | Contoh endpoint backend                               |
| ----------- | --------------------------------------------- | ----------------------------------------------------- |
| Publik      | `/`, `/pustaka`, `/pustaka/:slug`, `/bantuan` | `GET /api/articles`, informasi bantuan publik         |
| Akses       | `/masuk`, `/aktivasi`, `/pemulihan`           | `/api/auth/*`, `GET /api/me`                          |
| Persetujuan | `/informasi-data`, `/persetujuan`             | `/api/consent-policy`, `/api/consents`                |
| Siswa       | `/app`, `/app/catat`, `/app/rencana`          | `/api/journals`, `/api/tasks`, endpoint milik sendiri |
| Guru BK     | `/bk`, `/bk/permintaan/:id`                   | `/api/bk/dashboard`, bantuan sesuai penugasan         |
| Admin       | `/admin`, `/admin/konten`                     | `/api/admin/*`                                        |

Nama URL mengikuti PRD Bagian 6/15. Tambahkan endpoint keamanan `GET /api/auth/csrf` untuk token sinkronisasi dan operasi MFA sesuai alur. Token CSRF diperbarui sesudah rotasi sesi. Error API konsisten: kode, pesan, field errors jika relevan, request ID nonrahasia.

Route frontend untuk galeri, pertanyaan skrining, pratinjau bantuan, dan hasil simulasi boleh menjadi route turunan atau state alur sesuai kebutuhan. Reload tidak boleh membuka isi milik orang lain atau melewati izin.

## 7. Environment dan komunikasi

### 7.1 Frontend

Contoh konfigurasi publik:

```dotenv
VITE_API_BASE_URL=/api
```

Konfigurasi frontend harus dianggap dapat dibaca pengunjung. Database URL, secret sesi, kunci enkripsi, dan kredensial operator hanya berada di backend.

### 7.2 Backend

| Variabel rencana    | Kegunaan                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `NODE_ENV`          | Development/test/production runtime                                                        |
| `APP_MODE`          | Demo atau pilot; ditetapkan server                                                         |
| `PORT`              | Port API, acuan lokal 3000                                                                 |
| `DATABASE_URL`      | Database sesuai lingkungan                                                                 |
| `SESSION_SECRET`    | Secret sesi dari penyimpanan rahasia                                                       |
| `APP_ORIGIN`        | Origin publik yang diizinkan                                                               |
| `ENCRYPTION_KEY_ID` | Referensi versi kunci enkripsi                                                             |
| `ENCRYPTION_KEY`    | Material kunci untuk lingkungan yang menggunakannya; produksi dapat memakai secret manager |
| `LOG_LEVEL`         | Tingkat log tersanitasi                                                                    |

`.env.example` berisi nama/keterangan dan placeholder, bukan secret yang bisa dipakai. Validasi environment harus menolak secret kosong atau konfigurasi tidak sesuai mode. Database demo, test, dan pilot terpisah.

### 7.3 Development dan produksi

- Lokal: Vite di port acuan 5173, API 3000. Proxy Vite meneruskan `/api` ke backend.
- Produksi: satu origin publik; reverse proxy mengarahkan `/api` ke Express dan sisanya ke hasil build frontend.
- Fallback SPA hanya untuk rute halaman; API tidak ditemukan tetap memberi error JSON, bukan `index.html`.
- Cookie produksi `HttpOnly`, `Secure`, `SameSite` sesuai arsitektur; proxy HTTPS dan trust proxy dikonfigurasi eksplisit.
- Request lintas origin, bila kelak diperlukan, memakai allowlist origin/credentials dan perlindungan CSRF yang sesuai; jangan membuka wildcard untuk sesi.
- Worker dijalankan sebagai proses terkelola terpisah dan memiliki akses database/kunci sebatas kebutuhan.
- Job pengingat eksternal/push baru ditambahkan pada fase lanjutan PRD; baseline tetap dalam aplikasi.

## 8. Integrasi hasil UI dari Stitch

1. Petakan hasil generate ke ID layar design.md dan file halaman Bagian 6.2.
2. Pindahkan aset publik ke `assets/` atau `public/` sesuai cara pemakaiannya.
3. Pisahkan shell, navigasi, Button, Input, Card, Dialog, state, dan komponen fitur.
4. Konversi markup hasil desain menjadi JSX dan CSS Modules; tokens ungu-lime berada di `styles/tokens.css`.
5. Ganti data statis dengan adapter demo terisolasi, lalu hubungkan fungsi API saat backend siap.
6. Terapkan status form, error, keyboard/fokus, aksesibilitas, dan izin rute.
7. Uji alur lengkap terhadap backend; UI yang tampil tidak membuktikan penyimpanan/pengiriman berjalan.

Warna/acuan visual mengikuti design.md. Empat menu utama siswa tetap Beranda, Tenang, Catat, Refleksi. Guru/admin tidak mendapat komponen untuk membaca jurnal pribadi.

## 9. Scripts dan konvensi

Scripts berikut merupakan **kontrak yang akan dibuat saat scaffold**, belum tersedia untuk dijalankan pada kondisi repositori sekarang.

| Workspace | Script              | Perilaku rencana                        |
| --------- | ------------------- | --------------------------------------- |
| Root      | `dev:frontend`      | Delegasi ke dev frontend                |
| Root      | `dev:backend`       | Delegasi ke dev API                     |
| Root      | `dev:worker`        | Delegasi ke worker                      |
| Root      | `build`             | Build frontend                          |
| Root      | `test`              | Unit/component/integrasi dua workspace  |
| Root      | `lint`              | Lint dua workspace                      |
| Frontend  | `dev`               | Vite                                    |
| Frontend  | `build` / `preview` | Build/preview hasil frontend            |
| Frontend  | `test` / `test:e2e` | Vitest / Playwright                     |
| Backend   | `dev` / `start`     | API watch / API normal                  |
| Backend   | `worker`            | Worker job                              |
| Backend   | `db:migrate`        | Migrasi database yang dikonfigurasi     |
| Backend   | `db:seed:demo`      | Seed dengan guard mode/database         |
| Backend   | `test`              | Unit dan integrasi dengan database test |

Contoh setelah scaffold tersedia: `npm run dev --workspace frontend` dan `npm run dev --workspace backend`. Package workspace dinamai `frontend` dan `backend` agar perintah tersebut konsisten.

Konvensi:

- Komponen/halaman `PascalCase.jsx`, hook fungsi `useCamelCase`, folder `kebab-case`.
- Backend memakai `nama-modul.service.js` dan pola serupa; query/database tidak diakses frontend.
- UI berbahasa Indonesia; penamaan kode memakai istilah Inggris yang konsisten.
- Validasi frontend untuk UX; validasi backend menjadi sumber keputusan. Kontrak OpenAPI serta tes mencegah schema drift.
- Data aktual/timestamp/durasi/instrumen tidak dibuat dari perkiraan komponen UI.
- Log tidak berisi payload pribadi, token, jawaban, atau rahasia. Kunci enkripsi terpisah database dan kode.
- File terbangun `frontend/dist/`, dependency, environment rahasia, coverage, dan laporan test sensitif masuk aturan ignore yang sesuai.

## 10. Urutan pembangunan

1. Bootstrap npm workspaces, React template JavaScript, Express ESM, lint/format.
2. Database/migration, konfigurasi, session store, auth/MFA, policy akses, persetujuan.
3. Tokens/layout hasil Stitch dan komponen UI bersama.
4. Mood, jurnal, latihan, perencana, refleksi, pustaka.
5. Pengingat baseline, bantuan sukarela/status, pesan kelompok.
6. Agregasi mingguan tersupresi, ruang guru, administrasi akun/konten/sekolah.
7. Instrumen/skoring hanya setelah keputusan ahli sesuai PRD; demo tetap berlabel.
8. Penghapusan/retensi, backup/restore, pengujian izin, E2E, aksesibilitas, persiapan pilot.

Kontrol keamanan dan pengujian mengikuti implementasi modul sejak awal; tahap akhir melengkapi verifikasi menyeluruh. Data nyata hanya digunakan setelah gerbang pilot PRD terpenuhi.

## 11. Kontrol dokumen

| Dokumen        | Tanggung jawab                                            |
| -------------- | --------------------------------------------------------- |
| `PRD.md`       | Kebutuhan, batas, data, penerimaan, evaluasi              |
| `design.md`    | Visual, layout, prototype, prompt Stitch                  |
| `structure.md` | Stack JavaScript/React, folder, pembagian kode, integrasi |

Referensi teknis ditautkan pada bagian yang menggunakannya dan diperiksa pada 20 November 2026. Nomor versi dependency final dicatat saat bootstrap setelah kompatibilitas diuji, bukan dianggap sudah terpasang.

| Versi | Tanggal          | Perubahan                                                                                                 |
| ----- | ---------------- | --------------------------------------------------------------------------------------------------------- |
| 1.0   | 20 November 2026 | Dua folder utama, stack React/JavaScript, modul F1-F9, pemetaan 38 layar, environment, integrasi, scripts |
