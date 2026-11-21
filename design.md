# TENANGIN.ID — Spesifikasi Desain

> Alur akses terbaru: akun siswa yang disetujui langsung membuka fitur utama pada mode `account_approval`. Dashboard menampilkan mood, perencana, pengingat, Catat, Refleksi, serta Bantuan; panel kebijakan digunakan pada mode `consent`. Pengaturan akun menyediakan jeda pencatatan dan pengelolaan data. Lihat docs/STUDENT_DASHBOARD.md.

| Atribut         | Nilai                                                              |
| --------------- | ------------------------------------------------------------------ |
| Versi / tanggal | 2.3 / 21 November 2026                                             |
| Acuan kebutuhan | PRD.md v1.1, terutama Bagian 4.2 dan 26                            |
| Cakupan aktif   | Sembilan halaman D01–D09, desktop dan mobile                       |
| Implementasi    | React + Vite, CSS Modules, token di frontend/src/styles/tokens.css |
| Status          | UI diselaraskan; review ahli/sekolah T73 belum selesai             |

Dokumen ini menggantikan inventaris 38 layar pada v1.0. Rincian state tetap bagian dari alur inline, bukan kewajiban menambah halaman. Versi lama disimpan di docs/archive/design-v1.0.md untuk keterlacakan. Ekspor Stitch asli dipertahankan sebagai referensi komposisi; privasi dan role mengikuti PRD aktif.

## 1. Arah dan navigasi

Bahasa Indonesia, hangat, jelas, tidak menghakimi. Identitas mengikuti logo klien: teal gelap, hijau daun, sage, dan krem. Logo lengkap, emblem, serta wordmark menggunakan aset asli klien; area menulis/membaca putih atau hijau lembut. Plus Jakarta Sans dibundel lokal; ikon Lucide dan ilustrasi original tanpa CDN. Tidak ada klaim efektivitas, diagnosis, ranking, streak, AI atas jurnal, atau layanan darurat 24 jam.

Siswa memiliki empat menu utama: Beranda, Tenang, Catat, Refleksi. Desktop memakai header; mobile memakai navigasi bawah. Bantuan publik dan tombol “Butuh bicara?” selalu dapat ditemukan. Pengaturan akun berbentuk panel/dialog. BK dan Superadmin memakai shell serta badge berbeda.

## 2. Design tokens

### 2.1 Warna

| Token CSS                | HEX                 | Penggunaan                                 |
| ------------------------ | ------------------- | ------------------------------------------ |
| `--color-brand-green`    | `#438B6B`           | Hijau daun untuk ilustrasi dan dekorasi    |
| `--color-primary`        | `#195654`           | Tombol utama, tautan, ikon, fokus aktif    |
| `--color-primary-hover`  | `#124643`           | Hover tombol utama                         |
| `--color-primary-active` | `#0D3835`           | Tombol utama saat ditekan                  |
| `--color-primary-soft`   | `#EDF4EE`           | Menu aktif, chip, kartu penjelas           |
| `--color-accent`         | `#A1BF7A`           | Aksen hijau muda dari wordmark .id         |
| `--color-accent-soft`    | `#F0F4E8`           | Latar pendukung dan panel latihan          |
| `--color-on-accent`      | `#173326`           | Teks pada aksen, termasuk hover dan active |
| `--color-sage`           | `#D5DFBF`           | Sage dari pita tagline logo                |
| `--color-mint`           | `#90B99A`           | Hijau lembut dari bingkai emblem           |
| `--color-bg`             | `#FCFBF8`           | Latar krem aplikasi dan PWA                |
| `--color-surface`        | `#FFFFFF`           | Kartu dan formulir                         |
| `--color-surface-muted`  | `#F3F5EE`           | Area pendukung dan tabel                   |
| `--color-text`           | `#243C33`           | Teks utama                                 |
| `--color-text-secondary` | `#526559`           | Deskripsi sekunder                         |
| `--color-text-muted`     | `#65766A`           | Metadata                                   |
| `--color-border`         | `#E0E6D9`           | Pemisah dekoratif dan kartu                |
| `--color-border-strong`  | `#7B8D7D`           | Batas kontrol input                        |
| success                  | `#17724A / #EAF7EF` | Konfirmasi simpan                          |
| warning                  | `#805400 / #FFF6E0` | Informasi perlu perhatian                  |
| error                    | `#A52C3D / #FFF0F2` | Kesalahan atau hapus                       |

Kontras dihitung dari sRGB: putih pada teal 8,40:1; teal pada hijau lembut 7,51:1; teks sekunder pada putih 6,24:1 dan pada krem 6,03:1; metadata pada krem 4,66:1. Teks aksen tetap gelap pada seluruh state. Batas kontrol terhadap putih 3,53:1.

Logo terdapat di frontend/src/assets/brand; favicon serta ikon PWA 192/512 menggunakan emblem yang sama. Nama varian komponen lama seperti lavender dan lime tetap kompatibel, dengan warna yang bersumber dari token hijau baru.

### 2.2 Tipografi

Pilih **Plus Jakarta Sans** untuk judul dan isi; fallback `Arial, sans-serif`. Gunakan satu keluarga dengan beberapa bobot agar konsisten. Ini pilihan desain, bukan font yang diwajibkan proposal.

| Gaya           | Desktop | Mobile | Bobot/line-height         |
| -------------- | ------- | ------ | ------------------------- |
| Hero headline  | 64 px   | 36 px  | 700 / 1,08                |
| Judul halaman  | 36 px   | 28 px  | 700 / 1,2                 |
| Judul bagian   | 28 px   | 22 px  | 700 / 1,25                |
| Judul kartu    | 19 px   | 17 px  | 600 / 1,35                |
| Isi utama/form | 16 px   | 16 px  | 400 / 1,6                 |
| Label/tombol   | 14 px   | 14 px  | 600 / 1,4                 |
| Metadata       | 13 px   | 13 px  | 400-500 / 1,5             |
| Timer          | 64 px   | 56 px  | 700 / 1; tabular numerals |

Headline desktop maksimal sekitar 14-18 karakter per baris pada hero; batasi menjadi 2-3 baris. Isi artikel maksimal 65-70 karakter per baris. Jangan mengecilkan seluruh UI supaya banyak konten muat.

### 2.3 Spacing, bentuk, dan elevasi

- Skala ruang: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96` px.
- Gap kartu desktop 24 px; mobile 16 px.
- Radius: input 14 px; tombol 14 px; kartu 24 px; hero 32 px; shell landing 40 px; chip 999 px.
- Padding kartu 24-32 px desktop, 20 px mobile. Form mobile boleh 20 px tanpa kartu bersarang.
- Border 1 px; shadow ringan, misalnya `0 8px 28px rgba(45,25,80,0.06)`. Hindari shadow tebal pada setiap elemen.
- Tinggi tombol/input minimal 48 px; ikon tindakan memiliki target sentuh minimal 44 x 44 px.
- Ikon garis membulat 20-24 px, satu gaya konsisten. Ikon saja membutuhkan nama aksesibel dan tooltip pada desktop.
- Foto stok suasana sedih/klinis, glassmorphism, neon glow, dan gradient ramai tidak menjadi arah desain.

### 2.4 Identitas dan ilustrasi

Wordmark: `tenangin.id` dengan huruf lowercase, tebal, warna ink; titik/aksen kecil ungu. Simbol pendamping berupa dua lengkungan membulat yang memberi kesan awan/jeda, tetap sederhana pada ukuran kecil.

Ilustrasi utama: **awan ungu original**, bentuk organik sederhana, ekspresi netral ramah, ditemani satu lingkaran cream dan kartu catatan abstrak. Warna flat, tanpa tekstur berat, tanpa karakter milik referensi. Tidak memberi gestur seolah menyampaikan diagnosis atau menjanjikan bantuan manusia.

Ukuran: landing desktop 380-440 px, mobile maksimal 200 px; Beranda maksimal 100-140 px. Jurnal, bantuan, dan dasbor staf cukup ikon kecil. Jika ilustrasi belum dibuat, gunakan bentuk vektor sederhana sebagai placeholder yang rapi; layout harus tetap utuh tanpanya.

## 3. Halaman kanonis dan penerimaan

| ID  | Halaman / file               | Alur yang harus tersedia                                                                                                              |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | public/LandingPage.jsx       | Hero, CTA login, cara kerja, privasi, bantuan dan footer                                                                              |
| D02 | student/HomePage.jsx         | Mood harian/lewati, tekanan opsional, tugas/langkah, tanggal opsional, istirahat, pengingat OFF, skrining berlabel dan pesan kelompok |
| D03 | student/TenangPage.jsx       | Tiga jenis latihan, teks, timer aktif, jeda/lanjut/berhenti, simpan status, pustaka/pencarian/artikel accordion                       |
| D04 | student/JournalPage.jsx      | Situasi/pikiran/perasaan, alternatif opsional, contoh, riwayat, CRUD, konflik versi dan simpan/buang draf saat keluar                 |
| D05 | student/ReflectionPage.jsx   | Tiga pertanyaan, minggu lokal, riwayat, edit/hapus dan tag strategi terkurasi                                                         |
| D06 | public/HelpPage.jsx          | Kontak/jam/batas layanan, penerima Superadmin, pesan/kontak opsional, preview, idempotensi, status/pembatalan                         |
| D07 | counselor/DashboardPage.jsx  | Metadata kode/jenis/waktu/status sesuai penugasan dan izin aktif; agregat mingguan aman, tanpa mutasi bisnis                          |
| D08 | superadmin/DashboardPage.jsx | Enam panel: ringkasan, akun/role, data siswa, konten, bantuan/pesan, pengaturan/audit                                                 |
| D09 | auth/LoginPage.jsx           | Login, daftar siswa, tampil/sembunyi sandi, pemulihan, dan MFA opsional staf                                                          |

Pustaka/latihan memerlukan login sesuai keputusan akses terbaru. Menu Pustaka tersembunyi sebelum login; API artikel/latihan memerlukan sesi aktif dan MFA staf, serta tidak disimpan dalam cache publik. Informasi bantuan tetap terbuka publik. Superadmin dapat CRUD jurnal, mood, refleksi, tugas/langkah, jadwal, pengingat dengan audit; sesi latihan/skrining asli hanya dibaca/dihapus. Panel data berpaginasi dan menampilkan error. Konten memiliki editor artikel/latihan, sumber/hak media, fase berdurasi, alur review/arsip. Setiap perubahan isi menghasilkan versi draf baru; referensi reviewer harus nyata untuk pilot.

## 4. Aturan data dan interaksi

- Persetujuan tidak dicentang otomatis. Akses Superadmin pada isi pribadi dijelaskan eksplisit. BK hanya menerima allowlist metadata dan agregat, tanpa teks, nilai mood/skor, judul tugas, pesan/kontak bantuan.
- Gagal menyimpan tidak menghapus input atau menampilkan sukses palsu. Draf jurnal berada di memori, tanpa localStorage; navigasi internal, reload, dan keluar browser dilindungi.
- Dialog memiliki nama aksesibel, fokus awal, perangkap Tab/Shift+Tab, Escape, pengembalian fokus dan scroll vertikal pada layar pendek.
- Mood/status memiliki label teks; jangan mengandalkan warna. Semua kontrol berlabel; sentuhan utama minimal 44 px, fokus keyboard terlihat.
- Snapshot hanya minggu selesai, definisi/periode terlihat, k=5 serta supresi sekunder berlaku pada seluruh representasi. Filter metadata tidak mengubah agregat.
- Loading, kosong, error/retry, offline, sesi habis, tidak berizin, sukses dan tersupresi merupakan state terpisah. Tidak mengklaim tersimpan sebelum konfirmasi server.
- Pengingat hanya dalam aplikasi. Audio eksternal, push, PWA dan ekspor tetap fase lanjutan yang tercantum pada TASKLIST.

## 5. Responsive dan review

Target lebar 320, 390 dan 1280 px. Grid memakai batas minimum yang tidak melebihi lebar parent; flex menyusut atau membungkus. Tabel staf menggulir dalam wadahnya tanpa memperlebar dokumen. Reflow diuji pada halaman terlindungi serta seluruh tab D08, bukan landing saja. Ukuran teks 200% dan reduced motion tetap menjaga akses bantuan dan kontrol; zoom manual dan kesetiaan visual akhir tetap termasuk review ahli media T73.

Uji browser mencakup navigasi draf (tetap mengedit, simpan lalu keluar, buang), gagal simpan/retry, fokus dialog, sesi dicabut, dua tab, serta pengelolaan konten/data Superadmin. Bukti terbaru dicatat pada TASKLIST dan frontend/tests/e2e/audit-regressions.spec.js; lolos screenshot/overflow tidak membuktikan efektivitas atau kelayakan pilot.

## 6. Harmonisasi UI menyeluruh — 20 November 2026

Komponen bersama memakai skala kontrol 48 px (standar), 44 px (ringkas), dan 52 px (utama berukuran besar). Input memakai tinggi 48 px, font isi 16 px, dan border 1 px. Tombol, tautan aksi, tab, badge, metadata, dan label memakai token tipografi; bobot font 500 turut dibundel lokal. Radius panel 18 px, kartu 24 px, dan jarak antarkartu 16–24 px mengikuti ruang tersedia.

Panel aksen menggunakan latar hijau lembut; hijau muda dipakai pada CTA dan aksen merek. Dialog, drawer akun, tabel, pagination, kartu metrik, state kosong/error/supresi, dan keenam panel Superadmin mengikuti fondasi yang sama. Header publik menampilkan navigasi pada ponsel; header akun menata tombol bantuan dan akun agar tetap mudah dijangkau. Keterangan ilustrasi dekoratif di jurnal/refleksi dihapus dari teks tampilan.

Pemeriksaan visual mencakup 51 kombinasi halaman/tab pada 320, 390, dan 1280 px. Pemeriksaan otomatis tersebut tidak menemukan overflow horizontal, tombol tampak di bawah 44 px, atau error JavaScript. T73 tetap memerlukan review manusia; penyelarasan visual tidak mengesahkan kesiapan penggunaan data siswa nyata.

Verifikasi tambahan mencakup 15 tampilan aktivasi akun, pemulihan sandi, persetujuan data, MFA, dan drawer akun pada ketiga lebar layar; tidak ditemukan overflow horizontal. Total 66 tampilan diperiksa. Seluruh 15 pengujian E2E, 5 pengujian komponen frontend, lint, dan build lulus. Versi cache publik dinaikkan agar aset tampilan lama dibersihkan saat service worker diperbarui.

Keputusan akses terbaru (20 November 2026): login staf/Superadmin standar menggunakan email dan sandi tanpa kode authenticator. State MFA hanya ditampilkan untuk akun yang secara eksplisit mengaktifkannya. Ketentuan lama yang menjadikan MFA langkah wajib digantikan oleh keputusan ini.

Keputusan pengelola 20 November 2026: aktivasi token publik diganti pendaftaran siswa dan persetujuan melalui dashboard Superadmin. Lihat docs/STUDENT_REGISTRATION.md. Siswa belum dapat masuk sebelum disetujui; persetujuan data pribadi tetap terpisah.

Perbaikan akses 20 November 2026: akun aktif langsung masuk ke `/app`. Persetujuan data ditampilkan di dalam shell siswa pada fitur pribadi dan `/app/persetujuan`; tidak menjadi tahapan login. Kebijakan kosong serta persetujuan wali yang belum dikonfirmasi ditampilkan sebagai status informatif dengan akses Pustaka dan Bantuan. Tidak ada permintaan API pribadi sebelum persetujuan aktif. Pengaturan Superadmin menyediakan penerbitan kebijakan yang ditinjau sekolah tanpa mengisi kebijakan atau persetujuan otomatis.
