# Paket Tinjauan Ahli Materi, Media, Guru BK, dan Pengelola Sekolah (T73)

> **Catatan Kejujuran Status T73:** Paket dokumen ini serta modul pencatatan keputusan di Dashboard Superadmin (`Tab 6 -> Tinjauan Ahli & Pengelola Sekolah`) telah dibangun dan diverifikasi secara teknis. Namun, **pengesahan manusia oleh ahli materi/media, guru BK, dan pengelola sekolah** belum terjadi sehingga status item `T73` pada `TASKLIST.md` dan seluruh domain pada tabel `governance_reviews` dipertahankan sebagai terbuka (`pending_review`) hingga rapat tinjauan nyata dilaksanakan.

## 1. Inventaris Isi & Aset yang Perlu Ditinjau

### A. Enam Artikel Pustaka Psikoedukasi (`F8`)

Seluruh artikel bersumber dari draf internal proyek (`status: published` pada mode demo) dan bebas hak cipta eksternal:

1. `memahami-stres-belajar-tanpa-menyalahkan-diri` — _Kenapa tubuh kita tegang saat menghadapi ujian atau tumpukan tugas?_
2. `mengenali-tanda-stres-emosi-perilaku` — _Mengenali tanda tubuh, pikiran, dan emosi saat terbebani_
3. `cara-menghadapi-pikiran-mengganggu` — _Ketika pikiran otomatis terasa keras pada diri sendiri_
4. `memecah-beban-belajar-menjadi-langkah-kecil` — _Memecah beban tugas yang terasa menumpuk_
5. `tidur-jeda-dan-menjaga-energi` — _Jeda sejenak, tidur cukup, dan ritme belajar manusiawi_
6. `kapan-bercerita-ke-guru-bk` — _Kapan sebaiknya mulai bercerita atau mengirim permintaan bantuan?_

**Fokus pertanyaan tinjauan:** ketepatan bahasa remaja SMA/MA kelas X–XI, nada non-menghakimi, bebas istilah klinis/diagnosis, dan kejelasan batas layanan non-darurat.

### B. Tiga Latihan Regulasi Diri, Audio Internal, & Ilustrasi (`F4` & `L03`)

1. `latihan-napas-terpandu` — _Latihan Napas Terpandu (Contoh 4-4-4)_ (`/audio/napas-terpandu-4-4-4.wav`, 3 menit)
2. `relaksasi-otot-progresif` — _Relaksasi Otot Progresif_ (`/audio/relaksasi-otot-progresif.wav`, 4 menit)
3. `mindfulness-jeda-sejenak` — _Mindfulness Jeda Sejenak_ (`/audio/mindfulness-5-4-3-2-1.wav`, 5 menit)

- **Instruksi Berhenti (`stop_notice`):** Setiap latihan memuat peringatan aman agar siswa berhenti kapan saja tanpa dianggap gagal.
- **Hak Pakai Audio & Visual:** Audio disintesis internal melalui `frontend/scripts/generate-media-assets.mjs` dan ilustrasi dibuat via SVG internal (`ExerciseIllustrations.jsx`) tanpa ketergantungan media berhak cipta eksternal. Audio bersifat opt-in (tidak pernah autoplay) dan tetap 100% setara teks.

### C. Instrumen Skrining Mandiri (`F2`)

- Mode `demo`: menggunakan fixture simulasi berlabel eksplisit _"Simulasi, bukan hasil penilaian"_.
- Mode `pilot`: **wajib menunggu pengesahan ahli (Domain D2 & D3)** atas instrumen tervalidasi, hak penggunaan/lisensi, aturan skoring, dan naskah respons.

## 2. Tata Kelola Privasi, Akses Superadmin, & Prosedur Bantuan

| Domain                      | Implementasi Saat Ini                                                                                                     | Keputusan yang Harus Disahkan Sebelum Pilot                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| D1 Identitas & Zona Waktu   | `SMA-CONTOH-01`, `Asia/Jakarta` (mendukung WIB/WITA/WIT & multi-sekolah L05)                                              | Nama sekolah resmi, zona waktu nyata, daftar kelompok aktif                 |
| D2 & D3 Instrumen Skrining  | Fixture simulasi terisolasi; nonaktif di pilot tanpa instrumen resmi                                                      | Penetapan instrumen sah, lisensi, skor batas, dan pesan dukungan            |
| D4 Persetujuan & Wali       | Persetujuan berversi `1.1`, teks menyebut akses Superadmin ke isi pribadi                                                 | Penetapan `guardian_consent_required` dan naskah persetujuan resmi          |
| D5 & D6 Agregat & Supresi   | Ambang minimum `k = 5` kontributor berbeda + supresi sekunder lintas `bk.routes.js` & `exports.routes.js`                 | Konfirmasi kesesuaian `k = 5` untuk ukuran kelompok sekolah mitra           |
| D7 Layanan Bantuan          | Penerima Superadmin sekolah; tanpa fitur chat konseling                                                                   | Penetapan petugas nyata, kontak terverifikasi, jam layanan, dan SOP rujukan |
| D8 Akses Superadmin & Audit | Superadmin sekolah dapat membaca/mengedit data siswa lewat `/api/superadmin/*` dengan log `audit_events`                  | Review tata kelola pengawasan audit & otorisasi akun Superadmin sekolah     |
| D10 Retensi & Penghapusan   | Retensi dapat dikonfigurasi (`retention_days`, default 90 hari), penghapusan akun + tombstone, backup/restore AES-256-GCM | Penetapan durasi retensi & jadwal verifikasi backup/restore operator        |
| D13 Materi & Media          | 6 artikel, 3 latihan teks + audio internal opt-in + ilustrasi                                                             | Pemeriksaan dua putaran oleh ahli materi dan ahli media                     |

## 3. Cara Mencatat Keputusan Tinjauan di Aplikasi

1. Masuk sebagai `superadmin` (`Admin-Root-01`) + MFA di D09 Login.
2. Buka **Dashboard Superadmin (D08) -> Tab 6: Pengaturan & Audit -> Tinjauan Ahli & Pengelola Sekolah (Gerbang Pilot T73)**.
3. Klik **Catat Keputusan** pada domain yang ditinjau, isi nama peninjau, peran peninjau (`Ahli Materi`, `Ahli Media`, `Guru BK`, atau `Pengelola Sekolah`), status (`Perlu Revisi`, `Disahkan`, atau `Ditunda`), ringkasan keputusan, serta catatan revisi.
4. Setiap penyimpanan menaikkan versi catatan tinjauan dan merekam peristiwa `governance_review_updated` pada log audit sistem.
