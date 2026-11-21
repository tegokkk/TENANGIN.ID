# TENANGIN.ID - Tasklist Pengerjaan

| Atribut         | Acuan                                                      |
| --------------- | ---------------------------------------------------------- |
| Versi / tanggal | 1.1 / 20 November 2026                                     |
| Kebutuhan       | [PRD.md](./PRD.md), terutama revisi role Bagian 4.2 dan 26 |
| UI              | [design.md](./design.md) v2.1, sembilan halaman D01-D09    |
| Struktur/stack  | [structure.md](./structure.md) v1.2                        |
| Stack inti      | React + Vite, JavaScript, Node.js + Express, PostgreSQL    |
| Folder aplikasi | `frontend/` dan `backend/`                                 |

Gunakan `[ ]` untuk belum selesai dan `[x]` hanya setelah hasil dapat diperiksa. ID Txx adalah ID pekerjaan; D01-D09 adalah ID halaman. Saat menandai selesai, tambahkan bukti singkat seperti file, hasil uji, atau catatan review.

**Kondisi awal:** dokumen dan ekspor Stitch tersedia. Folder aplikasi backend/frontend belum tersedia saat checklist ini dibuat. Desain HTML bukan bukti autentikasi, penyimpanan, atau hak akses sudah berfungsi.

## 1. Bahan yang sudah tersedia

- [x] T01 - PRD tersedia dan sudah memuat revisi role terbaru.
- [x] T02 - Design tersedia: sembilan halaman, Login terpisah, dashboard BK/Superadmin berbeda.
- [x] T03 - Structure tersedia: React/JavaScript, dua folder aplikasi, modul F1-F9.
- [x] T04 - Ekspor Stitch D01-D09 ditemukan, masing-masing memiliki `code.html` dan `screen.png` di `stitch_tenangin_prototype_platform/`.

Bukti T01-T04: pemeriksaan file pada workspace, bukan verifikasi fungsi aplikasi.

## 2. Urutan dan hasil tiap tahap

| Tahap | Pekerjaan                | Dependensi        | Hasil yang harus dapat diperiksa                              |
| ----- | ------------------------ | ----------------- | ------------------------------------------------------------- |
| A     | Audit ekspor Stitch      | Bahan awal        | Pemetaan sembilan halaman dan daftar penyesuaian              |
| B     | Fondasi proyek           | A                 | Dua aplikasi dapat dijalankan, API terhubung                  |
| C     | Database dan aturan data | B                 | Migrasi, constraint, dataset demo/test                        |
| D     | Login, role, persetujuan | C                 | Tiga role diarahkan dan dibatasi oleh server                  |
| E     | Komponen UI bersama      | B, A              | Shell responsif dan komponen konsisten                        |
| F     | Aktivitas siswa          | C, D, E           | D01-D06 berfungsi dengan penyimpanan nyata di lingkungan demo |
| G     | Monitoring BK            | D, F              | D07 read-only, hanya metadata penugasan                       |
| H     | Pengelolaan Superadmin   | D, F, G           | D08 mengelola seluruh domain dengan audit                     |
| I     | Job dan pengelolaan data | C, F, H           | Agregasi, retensi, penghapusan berjalan                       |
| J     | Verifikasi dan rilis     | Semua fungsi inti | Bukti pengujian, panduan operasi, demo siap ditinjau          |

Bangun serta uji tiap modul saat dikerjakan. Tahap J menguji alur menyeluruh setelah integrasi; pemeriksaan izin tidak ditunda sampai akhir.

## 3. Tahap A - Audit hasil Stitch

- [x] T05 - Petakan sembilan folder ekspor ke D01-D09 dan file halaman pada structure.md. (`docs/audit/stitch-audit.md`)
- [x] T06 - Bandingkan `screen.png` dan HTML dengan design.md; catat perbedaan layout, menu, copy, warna, dan role. (`docs/audit/stitch-audit.md`)
- [x] T07 - Inventaris aset, font, ikon, link, dan dependency eksternal; periksa hak pakai serta aset yang gagal dimuat. (`docs/audit/stitch-audit.md`, CDN diganti `@fontsource/plus-jakarta-sans`, `lucide-react`, dan SVG inline)
- [x] T08 - Rencanakan konversi HTML/Tailwind CDN pada ekspor menjadi JSX dan CSS Modules sesuai stack; satukan tokens visual. Pertahankan ekspor asli sebagai referensi. (`docs/decisions/001-javascript-react-express.md`; folder `stitch_tenangin_prototype_platform/` tetap utuh)

**Selesai bila:** setiap halaman punya tujuan file yang jelas dan perubahan yang diperlukan tercatat. Tidak perlu generate ulang halaman yang sudah sesuai.

## 4. Tahap B - Fondasi backend/frontend

- [x] T09 - Buat npm workspaces root dengan paket `backend` dan `frontend`; pilih versi kompatibel, catat Node, dan simpan lockfile. (`package.json`, `package-lock.json`, `.nvmrc`)
- [x] T10 - Scaffold React + Vite JavaScript; siapkan routing, Query, form, CSS Modules, dan konfigurasi editor. (`frontend/package.json`, `frontend/vite.config.js`, `.editorconfig`)
- [x] T11 - Scaffold Express ES Modules dengan `app.js`, `server.js`, router `/api`, serta entry worker terpisah. (`backend/src/app.js`, `backend/src/server.js`, `backend/src/worker.js`)
- [x] T12 - Siapkan environment tervalidasi dan `.env.example` tanpa secret; pisahkan mode/database demo, test, dan pilot. (`backend/src/config/env.js`, `backend/.env.example`, `frontend/.env.example`)
- [x] T13 - Hubungkan frontend/API lewat proxy development; buat health/readiness dan format error konsisten tanpa detail sensitif. (`frontend/vite.config.js`, `GET /api/health`, `GET /api/ready`, `backend/src/middleware/error-handler.middleware.js`)
- [x] T14 - Siapkan lint/format, test runner, scripts workspace, serta README setup yang dapat diikuti dari checkout baru. (`npm run lint`, `npm test`, `README.md`)

**Selesai bila:** React dan API berjalan; request dari browser mencapai backend; konfigurasi tidak valid gagal dengan pesan teknis yang aman.

## 5. Tahap C - Database dan model data

- [x] T15 - Siapkan PostgreSQL, koneksi Knex/pg, migration runner, database test, dan pemisahan akses operator/runtime. (`backend/scripts/local-pg.mjs`, `backend/knexfile.js`, role `tenangin_admin` & `tenangin_app`, DB `tenangin_demo` & `tenangin_test`)
- [x] T16 - Buat migrasi sekolah, akun, role `student/bk/superadmin`, penugasan BK, sesi, aktivasi/pemulihan, MFA, kebijakan dan persetujuan. (`backend/database/migrations/202611200001_core_auth_and_consent.js`)
- [x] T17 - Buat migrasi mood, instrumen/respons skrining, jurnal, materi/sesi latihan, tugas/langkah/jadwal, pengingat, refleksi, dan artikel. (`backend/database/migrations/202611200002_student_activities_and_content.js`)
- [x] T18 - Buat migrasi bantuan/event status/respons, pesan kelompok, snapshot agregat, audit, penghapusan, dan metadata aktivitas yang dibutuhkan monitoring. (`backend/database/migrations/202611200003_help_feedback_aggregates_audit.js`)
- [x] T19 - Terapkan foreign key, indeks, transaksi, serta unique constraint untuk mood harian, refleksi mingguan, dan idempotensi bantuan; tetapkan UTC/tanggal lokal. (constraint unik harian/mingguan/idempotensi + `backend/src/lib/time.js`)
- [x] T20 - Buat seed tiruan untuk tiga role, penugasan, aktivitas, konten, dan bantuan; lindungi seed agar tidak masuk database pilot. (`backend/database/seeds/demo-seed.js`, guard `APP_MODE=demo` & `ALLOW_DEMO_SEED=true`)
- [x] T21 - Siapkan hash password dan enkripsi data terbatas sesuai structure.md; pisahkan kunci, versi kunci, serta mekanisme pemulihannya. (`argon2` Argon2id pada `backend/src/lib/password.js`, AES-256-GCM keyring pada `backend/src/lib/encryption.js`)

**Selesai bila:** database kosong dapat dimigrasikan dan diisi demo; constraint mencegah duplikasi; data tiga role tersedia tanpa memakai data siswa nyata.

## 6. Tahap D - Login, role, dan persetujuan

- [x] T22 - Implementasikan Login D09: kode akun/kata sandi, tampil/sembunyi, validasi, error netral, dan state loading; role berasal dari server. (`frontend/src/pages/auth/LoginPage.jsx`, `backend/src/modules/auth/`)
- [x] T23 - Implementasikan Passport/sesi PostgreSQL, regenerasi sesi saat login, cookie aman, logout/revokasi, serta penghapusan cache pribadi frontend. (`backend/src/config/passport.js`, `backend/src/config/session.js`, `frontend/src/features/auth/AuthContext.jsx`)
- [x] T24 - Implementasikan aktivasi/pemulihan melalui bagian dalam halaman Login; token sekali pakai, kedaluwarsa, dan proses sekolah terverifikasi. (`POST /api/auth/activate`, `POST /api/auth/recover`, `tests/integration/auth-mfa-consent.test.js`)
- [x] T25 - Implementasikan MFA staf beserta enrollment/pemulihan; sesi menunggu verifikasi tidak dapat membuka dashboard staf. (`otplib`, `require-mfa.middleware.js`, teruji di integrasi & E2E)
- [x] T26 - Implementasikan role/policy backend: siswa milik sendiri, BK metadata sesuai penugasan, Superadmin seluruh domain melalui endpoint khusus. (`backend/src/policies/`, `/api/bk/*`, `/api/superadmin/*`)
- [x] T27 - Implementasikan redirect dan route guard: siswa -> D02, BK -> D07, Superadmin -> D08; pemalsuan role dari form/payload tidak berpengaruh. (`frontend/src/guards/RouteGuards.jsx`, `frontend/src/guards/role-home.js`)
- [x] T28 - Implementasikan informasi/persetujuan berversi yang menyebut akses Superadmin ke isi pribadi; penolakan tetap memberi akses pustaka/bantuan publik. (`backend/src/modules/consent/`, `require-consent.middleware.js`)
- [x] T29 - Implementasikan CSRF, rate limit, validasi input dan security headers; uji login, sesi, penugasan, role, serta blokir operasi tanpa izin. (`csrf-sync`, `express-rate-limit`, `helmet`, `tests/integration/auth-mfa-consent.test.js`)

**Selesai bila:** tiga akun masuk ke ruang yang benar; siswa/BK tidak dapat membuka API Superadmin; BK tidak dapat menulis data bisnis. Login/logout, MFA, dan perubahan sandi sendiri tetap bekerja untuk BK.

## 7. Tahap E - Komponen dan layout bersama

- [x] T30 - Terapkan tokens ungu-lime, font, radius, spacing, tombol, input, kartu, tabel, dialog/konfirmasi, dan status bersama. (`frontend/src/styles/tokens.css`, `frontend/src/components/ui/`)
- [x] T31 - Bangun PublicLayout, AuthLayout, StudentLayout, CounselorLayout, serta SuperadminLayout dengan badge peran yang jelas. (`frontend/src/layouts/`)
- [x] T32 - Buat empat menu siswa: Beranda/Tenang/Catat/Refleksi; header desktop, bottom navigation mobile, dan bantuan yang tidak menutupi konten. (`frontend/src/layouts/StudentLayout.jsx`)
- [x] T33 - Buat state bersama loading, kosong, gagal simpan, sukses, sesi habis, offline, tidak berizin, dan data tersupresi; pertahankan input saat gagal. (`frontend/src/components/states/`, `src/test/app-pages.test.jsx`)
- [x] T34 - Konversi ekspor menjadi komponen reusable; periksa keyboard, fokus, label, kontras, ukuran sentuh, serta reflow tanpa mengecilkan desktop. (`frontend/src/styles/globals.css`, `tests/e2e/resilience-and-responsive.spec.js`)

**Selesai bila:** shell dan komponen dipakai bersama, sembilan halaman tetap sederhana, serta form/player/status tidak berkembang menjadi halaman baru.

## 8. Tahap F - Halaman dan aktivitas siswa

- [x] T35 - D01 Landing: pasang hero, CTA menuju Login, cara kerja, privasi, bantuan, dan footer; perbaiki link mati dari ekspor. (`frontend/src/pages/public/LandingPage.jsx`)
- [x] T36 - D02 mood: pilihan berlabel, simpan/ubah harian, lewati, konfirmasi server, dan aturan tanggal lokal; nilai tidak masuk payload BK. (`frontend/src/pages/student/HomePage.jsx`, `backend/src/modules/mood/`)
- [x] T37 - D02 perencana: CRUD tugas/langkah, tanggal opsional, penting/mendesak, status selesai, dan blok istirahat; semuanya inline. (`backend/src/modules/planner/`, `HomePage.jsx`)
- [x] T38 - D02 pengingat: OFF default, jenis/waktu/jam tenang, penyimpanan preferensi, serta penjelasan pengingat dalam aplikasi. (`backend/src/modules/reminders/`, `HomePage.jsx`)
- [x] T39 - F2 skrining: status belum tersedia atau simulasi berlabel. Siapkan versi/skoring teruji untuk instrumen sah; jangan mengaktifkan penilaian nyata sebelum ahli menetapkannya. (`backend/src/modules/screening/`, `backend/database/fixtures/simulation-screening.js`)
- [x] T40 - D03 latihan: tiga kategori, player inline, waktu aktif, jeda/lanjut/berhenti, teks tanpa audio, serta simpan sesi; berhenti tidak dianggap gagal. (`frontend/src/pages/student/TenangPage.jsx`, `backend/src/modules/exercises/`)
- [x] T41 - D03 pustaka: tampilkan hanya materi terbit melalui accordion; tetap dapat dibaca publik tanpa izin data pribadi. (`backend/src/modules/library/`, `TenangPage.jsx`)
- [x] T42 - D04 jurnal: buat/baca/edit/hapus pada halaman yang sama, alternatif opsional, contoh realistis, konflik edit, dan keterangan akses pemilik/Superadmin. (`frontend/src/pages/student/JournalPage.jsx`, `backend/src/modules/journals/`)
- [x] T43 - D05 refleksi: tiga pertanyaan, satu entri per minggu, simpan/edit/hapus/riwayat inline; isi bebas tidak dikirim ke BK. (`frontend/src/pages/student/ReflectionPage.jsx`, `backend/src/modules/reflections/`)
- [x] T44 - D06 bantuan: informasi publik, penerima Superadmin, pesan/kontak opsional, pratinjau, pengiriman idempoten, status, dan pembatalan yang diizinkan. (`frontend/src/pages/public/HelpPage.jsx`, `backend/src/modules/help-requests/`)
- [x] T45 - Panel akun: ubah sandi, informasi kebijakan, tarik persetujuan dan permintaan hapus dengan autentikasi ulang; hentikan pengumpulan/pengingat saat izin ditarik. (`frontend/src/components/navigation/AccountSettingsPanel.jsx`, `backend/src/modules/privacy/`)
- [x] T46 - Hubungkan aktivitas siswa ke pencatatan metadata dan pesan kelompok; uji penyimpanan setelah reload, retry, klik ganda, serta penolakan akses ke data siswa lain. (`tests/integration/student-features-and-isolation.test.js`, `tests/e2e/student-journey.spec.js`)

**Selesai bila:** D01-D06 bekerja dengan data demo melalui API dan PostgreSQL. Perubahan terlihat sesudah reload; tidak hanya berubah di state React.

## 9. Tahap G - Dashboard BK read-only

- [x] T47 - D07: tampilkan kartu aktivitas dan tabel kode siswa/jenis/waktu/status sesuai ekspor yang telah diaudit. (`frontend/src/pages/counselor/DashboardPage.jsx`)
- [x] T48 - Buat endpoint `GET /api/bk/dashboard` dan `GET /api/bk/activities` dengan scope penugasan serta filter/pagination yang dibatasi. (`backend/src/modules/dashboard/bk.routes.js`)
- [x] T49 - Terapkan presenter allowlist metadata; jangan mengirim teks jurnal/refleksi, nilai mood/skor/jawaban, judul tugas, atau isi/kontak bantuan ke browser BK. (`backend/src/modules/dashboard/bk.presenter.js`)
- [x] T50 - Terapkan aturan agregat/supresi PRD; filter monitoring tidak boleh membuka nilai kelompok yang disembunyikan. (`backend/src/policies/aggregate-privacy.policy.js`, `k = 5` + supresi sekunder)
- [x] T51 - Uji BK read-only melalui request langsung: mutasi bisnis, konten pribadi, akun/role, bantuan, konfigurasi, serta siswa di luar penugasan ditolak. (`tests/integration/bk-readonly-and-superadmin.test.js`, `tests/e2e/bk-monitoring.spec.js`)

**Selesai bila:** BK hanya memantau. Menyembunyikan tombol saja tidak cukup; response API dan pemeriksaan server harus sesuai izin.

## 10. Tahap H - Dashboard Superadmin akses penuh

- [x] T52 - D08: bangun kartu ringkasan dan panel Ringkasan/Akun & role/Data siswa/Konten/Bantuan/Pengaturan dalam satu dashboard. (`frontend/src/pages/superadmin/DashboardPage.jsx`, `frontend/src/features/superadmin/`)
- [x] T53 - Kelola akun tiga role, aktivasi/nonaktif, pemulihan administratif, role, dan penugasan BK; provisioning pertama melalui operator berwenang. (`backend/src/modules/superadmin/`, `backend/scripts/bootstrap-admin.js`)
- [x] T54 - Implementasikan akses/CRUD data siswa melalui namespace `/api/superadmin/*`; tetap gunakan validasi domain, versi, dan identitas aktor Superadmin. (`backend/src/modules/superadmin/superadmin.routes.js`)
- [x] T55 - Catat audit pembacaan isi pribadi serta mutasi; tampilkan riwayat yang diperlukan tanpa menyalin konten sensitif ke log teknis. (`backend/src/modules/audit/audit.service.js`, `SettingsAuditPanel.jsx`)
- [x] T56 - Kelola artikel/latihan, versi, sumber/hak media, review, publikasi, arsip; hanya versi terbit terlihat di area publik. (`ContentPanel.jsx`, `backend/src/modules/superadmin/superadmin.routes.js`)
- [x] T57 - Kelola bantuan: terima, respons administratif, tindak lanjut/selesai, riwayat status, serta koordinasi layanan sekolah; tanpa chat konseling. (`HelpFeedbackPanel.jsx`, `help-state.js`)
- [x] T58 - Kelola pesan kelompok satu arah dan tampilkan hanya pada siswa kelompok tujuan; BK tidak dapat menerbitkan pesan. (`backend/src/modules/feedback/feedback.routes.js`, `HelpFeedbackPanel.jsx`)
- [x] T59 - Kelola sekolah, zona waktu, kontak terverifikasi, jam layanan, dan kebijakan data; perubahan penting dikonfirmasi serta diaudit. (`SettingsAuditPanel.jsx`, `superadmin.routes.js`)
- [x] T60 - Uji Superadmin dapat mengelola seluruh domain sementara siswa/BK ditolak; jangan menampilkan password polos, token, atau kunci sebagai data dashboard. (`tests/integration/bk-readonly-and-superadmin.test.js`, `tests/e2e/superadmin-control.spec.js`)

**Selesai bila:** kontrol Superadmin benar-benar memanggil API dan mengubah data, bukan sekadar tab statis. Akses pribadi sesuai informasi persetujuan.

## 11. Tahap I - Job, retensi, dan operasional data

- [x] T61 - Siapkan pg-boss, worker, retry, deduplikasi, pemantauan kegagalan, dan shutdown aman; payload job hanya referensi minimal. (`backend/src/jobs/boss.js`, `register-jobs.js`, `backend/src/worker.js`)
- [x] T62 - Implementasikan snapshot mingguan sesuai definisi PRD, versi instrumen, zona waktu, serta supresi; uji dengan fixture termasuk kelompok kecil. (`backend/src/jobs/handlers/aggregate-weekly.job.js`, `tests/integration/bk-readonly-and-superadmin.test.js`)
- [x] T63 - Implementasikan job retensi dan penghapusan akun/relasi; cabut sesi, batalkan pengingat, invalidasi snapshot, catat hasil minimal. (`backend/src/jobs/handlers/cleanup-retention.job.js`, `delete-account.job.js`)
- [x] T64 - Terapkan cache sensitif no-store, sanitasi log/error, dan pembersihan cache frontend saat berganti akun; tidak menyimpan data pribadi ke cache publik/localStorage. (`no-store.middleware.js`, `logger.js`, `AuthContext.jsx`, `src/test/app-pages.test.jsx`)
- [x] T65 - Siapkan backup terenkripsi dan uji restore, termasuk penerapan kembali daftar penghapusan sebelum akses dibuka. (`backend/scripts/backup-restore.mjs`, `tests/integration/jobs-deletion-and-backup.test.js`)

**Selesai bila:** job aman diulang, penghapusan dapat dibuktikan, dan pemulihan tidak menghidupkan kembali data yang seharusnya sudah dihapus.

## 12. Tahap J - Verifikasi dan kesiapan rilis

- [x] T66 - Jalankan unit/integrasi bermakna untuk waktu, skoring fixture, policy role, transaksi bantuan, supresi, dan retensi. (`npm test`: backend 7 file/32 tes & frontend 1 file/4 tes lulus; termasuk audit-regressions.test.js)
- [x] T67 - E2E siswa: Login/persetujuan -> mood -> latihan -> jurnal -> refleksi -> bantuan; pastikan data tersimpan dan tidak bocor ke akun lain. (`frontend/tests/e2e/student-journey.spec.js` lulus)
- [x] T68 - E2E BK: Login/MFA -> metadata penugasan; endpoint pribadi/mutasi/Superadmin tetap ditolak meski URL atau request dimanipulasi. (`frontend/tests/e2e/bk-monitoring.spec.js` lulus)
- [x] T69 - E2E Superadmin: Login/MFA -> akun/role/data/konten/bantuan/pengaturan; verifikasi hasil perubahan serta audit. (`frontend/tests/e2e/superadmin-control.spec.js` dan `audit-regressions.spec.js`: editor artikel/latihan, review/publikasi, CRUD tugas/langkah dan audit lulus)
- [x] T70 - Uji jaringan putus, gagal simpan, retry, dua tab, sesi dicabut, offline, dan perangkat bersama; perbaiki temuan yang memengaruhi data/izin. (`frontend/tests/e2e/resilience-and-responsive.spec.js`, `src/test/app-pages.test.jsx`, `tests/integration/auth-mfa-consent.test.js`)
- [x] T71 - Review sembilan halaman pada desktop/mobile, lebar minimum 320 px, keyboard, zoom, reduced motion, fokus, serta bantuan yang selalu dapat ditemukan. (`audit-regressions.spec.js`: seluruh halaman dan enam tab D08 pada 320/390/1280 px, fokus dialog/keyboard, teks 200% dan reduced motion publik/siswa; review ahli media tetap T73)
- [x] T72 - Uji build/lint dan deployment demo dari database kosong; verifikasi proxy HTTPS/cookie, fallback SPA, API 404 JSON, serta proses worker. (`npm run lint`, `npm run build`, `tests/integration/deployment-readiness.test.js`, migrasi DB kosong + worker startup)
- [ ] T73 - Review isi bersama ahli/pengelola: materi, skrining, akses Superadmin, retensi, kontak, jam, dan prosedur bantuan; catat keputusan serta revisi. *(Alat pencatatan keputusan `governance_reviews` di Dashboard Superadmin Tab 6, audit trail, dan paket materi siap tinjau `docs/REVIEW_PACK_T73.md` sudah dibangun & teruji; status tetap `[ ]` karena pengesahan resmi oleh ahli materi/media, guru BK, dan pengelola sekolah nyata belum dilaksanakan sebelum pilot)*
- [x] T74 - Siapkan panduan siswa/BK/Superadmin, README setup, runbook backup/restore/rollback, akun demo, dan daftar keterbatasan. (`README.md`, `docs/USER_GUIDES.md`, `docs/OPERATIONS_RUNBOOK.md`, `docs/DEMO_ACCOUNTS.md`, `docs/LIMITATIONS_AND_REVIEW.md`, `docs/api/openapi.yaml`)
- [x] T75 - Jalankan skenario demo akhir; catat hasil uji dan temuan tersisa. Tutup masalah kritis sebelum menyatakan siap ditinjau. (`npm run test:e2e`: 12/12 lulus; lint/build lulus; npm test 32 backend + 4 frontend; restore backup lama diuji di database test dengan ledger lokal/eksternal; bukti docs/audit/audit-fixes-2026-11-20.md)

**Demo siap bila:** sembilan halaman dan alur inti bekerja dengan data tiruan, tiga role benar, BK read-only di server, dan audit Superadmin tersedia.

**Pilot data nyata siap bila:** syarat demo terpenuhi serta gerbang PRD dipenuhi: kebijakan/izin yang sesuai, materi ditinjau, instrumen sah bila skrining diaktifkan, petugas/jam/kontak jelas, backup/restore dan penghapusan teruji, serta tanpa masalah kritis terbuka.

## 13. Checklist halaman

Centang halaman hanya setelah UI, API yang diperlukan, hak akses, dan state gagal telah diperiksa.

- [x] D01 - Landing. (`LandingPage.jsx`)
- [x] D02 - Beranda siswa: mood, rencana, pengingat. (`HomePage.jsx`)
- [x] D03 - Tenang: latihan/player dan pustaka inline. (`TenangPage.jsx`)
- [x] D04 - Catat: form dan riwayat jurnal. (`JournalPage.jsx`)
- [x] D05 - Refleksi: tiga pertanyaan dan riwayat. (`ReflectionPage.jsx`)
- [x] D06 - Bantuan: informasi, form, preview, status. (`HelpPage.jsx`)
- [x] D07 - Dashboard BK: metadata read-only. (`counselor/DashboardPage.jsx`)
- [x] D08 - Dashboard Superadmin: pengelolaan penuh. (`superadmin/DashboardPage.jsx`)
- [x] D09 - Login: redirect role, persetujuan, MFA. (`LoginPage.jsx`)

Checklist halaman adalah ringkasan penerimaan, bukan tugas tambahan di luar T01-T75.

## 14. Fase lanjutan

Bagian ini di luar target demo awal; aktifkan berdasarkan evaluasi dan kebutuhan.

- [x] L01 - Push notification eksternal dengan opt-in, pencabutan subscription, jam tenang, dan uji perangkat. (`backend/src/lib/web-push.js`, `reminders.routes.js`, `dispatch-push.job.js`, `HomePage.jsx`)
- [x] L02 - Instalasi PWA/cache konten publik; data pribadi tidak ikut di-cache. (`frontend/public/manifest.webmanifest`, `frontend/public/sw.js`, `frontend/src/lib/pwa.js`, `backend/src/lib/public-catalog.js`, `PublicLayout.jsx`)
- [x] L03 - Audio/ilustrasi tambahan yang hak pakainya jelas serta memiliki padanan teks. (`frontend/scripts/generate-media-assets.mjs`, `frontend/public/audio/*.wav`, `ExerciseIllustrations.jsx`, `TenangPage.jsx`, `JournalPage.jsx`, `ReflectionPage.jsx`)
- [x] L04 - Ekspor pribadi/agregat sesuai role, autentikasi ulang, dan aturan privasi yang berlaku. (`backend/src/modules/exports/exports.routes.js`, `AccountSettingsPanel.jsx`, `DashboardPage.jsx` BK & `SettingsAuditPanel.jsx` dengan supresi `k = 5` & sanitasi CSV)
- [x] L05 - Optimasi kapasitas dan perluasan sekolah setelah cakupan, operator, serta tata kelola ditetapkan. (`202611200004_phase2_push_governance_multitenant.js`, `compression.middleware.js`, `database.js`, `governance-capacity.routes.js`, `backend/scripts/capacity-check.mjs`)

## 15. Log pengerjaan

Isi saat pekerjaan berlangsung; jangan mengubah status hanya karena tampilan sudah dibuat.

| Tanggal          | ID tugas | Hasil/bukti                                  | Temuan atau langkah berikutnya      |
| ---------------- | -------- | -------------------------------------------- | ----------------------------------- |
| 20 November 2026 | T01-T04  | Dokumen dan sembilan folder ekspor ditemukan | Implementasi aplikasi belum dimulai |
| 20 November 2026 | T05-T72, T74-T75, D01-D09 | Audit Stitch & ADR selesai; stack React+Vite + Express ESM + PostgreSQL 15 + pg-boss terbangun utuh untuk D01-D09; verifikasi akhir: `npm run build` lulus, `npm run lint` lulus, `npm test` lulus (backend 6 file/19 tes, frontend 1 file/4 tes), `npm run test:e2e` lulus (4/4 skenario Chromium), `npm run backup:verify --workspace backend` lulus (`tablesCount: 26`). | `T73` tetap terbuka (menunggu tinjauan langsung ahli & sekolah sesuai `docs/LIMITATIONS_AND_REVIEW.md`); `L01-L05` tetap terbuka di fase lanjutan. |
| 20 November 2026 | L01-L05, dukungan teknis T73 | Implementasi Web Push VAPID + AES-128-GCM opt-in/jam tenang/worker (L01), PWA public-only cache + manifest/SW (L02), audio sintesis internal WAV & ilustrasi SVG setara teks (L03), ekspor JSON/CSV 3 role terautentikasi ulang dengan supresi k=5 & anti-formula CSV (L04), indeks komposit/gzip/pool/kapasitas/multi-sekolah (L05), serta modul pencatatan `governance_reviews` & `docs/REVIEW_PACK_T73.md` (T73). Verifikasi: `npm run build` lulus (1716 modul), `npm run lint` lulus, `npm run capacity:check --workspace backend` lulus (24 burst / 458ms), `npm test` lulus (backend 9 file/38 tes, frontend 1 file/5 tes), `npm run test:e2e` lulus (13/13 skenario Chromium), `npm run backup:verify --workspace backend` lulus (`tablesCount: 28`), worker smoke check lulus. | `T73` tetap `[ ]` hingga pengesahan langsung ahli & pengelola sekolah sebelum `APP_MODE=pilot`. |


## 16. Penutupan temuan audit implementasi — 20 November 2026

Acuan aktif: PRD v1.1 (Bagian 4.2/26), design v2.1, structure v1.2. Dokumen v1.0 tersimpan sebagai arsip historis, bukan kontrak aktif. Tidak ada perubahan role tersembunyi: arah TASKLIST dipertahankan (BK read-only, Superadmin teraudit); keputusan untuk pilot tetap harus ditinjau pada T73.

| Area | Status dan bukti |
| --- | --- |
| Dokumen/role/halaman | Diselaraskan; sembilan halaman dan batas operasi tiap role eksplisit |
| Retensi/penghapusan/restore | Aktivitas >90 hari dibersihkan, bantuan ikut cakupan entri, ledger terbaru dipertahankan saat restore dan sesi dicabut; tes regresi backend |
| Persetujuan/monitoring/agregat | Scope, kebijakan aktif, wali, penarikan, invalidasi dan minggu selesai ditegakkan; tes regresi backend |
| MFA recovery | Tepat satu request berhasil dari enam request paralel; tes regresi backend |
| Konten/audit | Semua mutasi latihan/artikel teraudit; perubahan isi memaksa versi draf baru dan mencabut review lama; tes API dan UI |
| Superadmin | CRUD domain siswa yang diizinkan, pagination, editor artikel/latihan, edit akun/role, konflik versi, audit serta penolakan siswa/BK |
| Draf/logout/ketahanan | Navigasi simpan/buang, offline/reconnect, dua tab, sesi dicabut dan perbaikan race cache logout; tes E2E |
| Responsive/aksesibilitas teknis | Sembilan halaman + enam tab D08 pada 320/390/1280; teks 200%/reduced motion publik-siswa, fokus dialog dan skip link; tes E2E |
| Verifikasi akhir | npm test: 32 backend + 4 frontend; E2E: 12/12 Chromium; lint/build lulus; migrasi demo dan test berhasil |
| T73 | Tetap terbuka: pengesahan sekolah/ahli, kelayakan materi, izin/hak akses, retensi dan SOP; bukan pekerjaan yang dapat digantikan tes kode |

E2E menyalakan sendiri API 3001/Vite 5174, hanya mereset database lokal tenangin_test dan memisahkan fixture per skenario. Jangan menjalankan unit/integrasi dan E2E bersamaan pada database yang sama. Laporan rinci ada di docs/audit/audit-fixes-2026-11-20.md. L01–L05 tetap fase lanjutan sesuai scope awal.
