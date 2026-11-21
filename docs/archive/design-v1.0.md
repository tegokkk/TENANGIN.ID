> ARSIP HISTORIS v1.0 — tidak berlaku sebagai acuan implementasi aktif. Gunakan dokumen bernama sama pada root proyek.

# TENANGIN.ID - Design Specification untuk Layout Prototype

| Atribut          | Nilai                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Versi            | 1.0                                                                                                                               |
| Tanggal          | 20 November 2026                                                                                                                  |
| Dasar kebutuhan  | [PRD.md](./PRD.md), khususnya Bagian 4-10, 13, 17, 19                                                                             |
| Referensi visual | Satu gambar yang dilampirkan pengguna, disimpan di [reference-01-purple-lime.png](./docs/references/reference-01-purple-lime.png) |
| Tujuan           | Brief visual, layout per layar, alur prototype, dan prompt untuk menghasilkan UI di Stitch                                        |
| Cakupan          | Website publik, aplikasi siswa, guru BK, admin, desktop dan mobile                                                                |
| Bahasa antarmuka | Bahasa Indonesia                                                                                                                  |
| Status           | Rancangan visual; semua data contoh bersifat fiktif                                                                               |

> PRD mengatur kebutuhan dan batas produk. Dokumen ini mengatur bentuk antarmuka. Palet ungu-lime di sini menggantikan usulan visual hijau kebiruan pada PRD Bagian 10.1, mengikuti referensi terbaru pengguna; fitur dan batas privasi PRD tetap berlaku. Gambar referensi dipakai sebagai inspirasi komposisi, bukan instruksi, konten, atau merek yang disalin.

## 1. Arah desain

**Konsep: ruang yang lega untuk berhenti sejenak, dengan karakter visual yang berani dan ramah siswa.**

Gunakan karakter referensi: bingkai ungu, kanvas putih besar dengan sudut membulat, hero lime, headline gelap yang kuat, ilustrasi ungu yang sedikit keluar dari batas panel, area lavender lembut, dan kartu sederhana dengan banyak ruang kosong.

Adaptasikan intensitasnya menurut tugas:

- **Website publik:** ekspresif; hero lime dan ilustrasi menjadi pusat perhatian.
- **Aplikasi siswa:** ringan; warna terang menjadi aksen, permukaan membaca/menulis tetap putih.
- **Guru/admin:** konsisten dengan merek, lebih padat dan tenang; data serta tindakan menjadi fokus.
- **Player latihan:** paling sederhana; sedikit elemen, tanpa dekorasi bergerak yang mengganggu.

Hasil yang diinginkan adalah website kontemporer untuk siswa SMA/MA, dengan keterbacaan dan kejelasan tugas yang cukup untuk layanan sekolah.

### 1.1 Analisis referensi dan penerapannya

| Unsur yang terlihat            | Adaptasi Tenangin.id                       | Aturan                                                       |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| Latar luar ungu cerah          | Bingkai landing desktop                    | Gunakan tipis di aplikasi; hilangkan bingkai tebal di mobile |
| Kanvas putih membulat besar    | Shell publik dan panel utama               | Jangan membuat semua komponen berbentuk kapsul               |
| Hero lime horizontal           | Pesan utama publik, banner pendek Beranda  | Area jurnal dan data tidak diberi lime penuh                 |
| Headline hitam besar           | Judul pendek dengan kata kunci ungu        | Maksimal satu aksen kata per headline                        |
| Ilustrasi ungu keluar panel    | Awan ungu original dengan bentuk sederhana | Tidak menutupi CTA, teks, atau keluar viewport               |
| Dua kartu pilihan berdampingan | Pilihan latihan atau pintasan aktivitas    | Label terkait kebutuhan siswa, bukan penjualan               |
| Langkah 1-4                    | Cara kerja: Kenali, Catat, Latih, Refleksi | Tanpa progress wajib/gamifikasi                              |
| Area lavender + grid putih     | Daftar aktivitas dan materi                | Card memuat satu tujuan dan tindakan jelas                   |
| CTA penutup dengan ilustrasi   | Ajakan mulai dan jalur guru BK             | Tanpa insentif uang, poin, atau klaim manfaat pasti          |

Tidak mengambil logo, bahasa Rusia, nomor telepon, keranjang, harga, bonus, atau karakter kucing pada referensi. Buat identitas/ilustrasi original untuk Tenangin.id.

### 1.2 Prioritas visual

1. Apa yang bisa dilakukan pengguna sekarang.
2. Privasi, kendali, dan batas layanan pada konteks yang tepat.
3. Navigasi yang stabil.
4. Ilustrasi dan aksen merek sebagai pendukung.

## 2. Design tokens

### 2.1 Warna

| Token                       | HEX                 | Penggunaan                                   |
| --------------------------- | ------------------- | -------------------------------------------- |
| `brand-purple`              | `#8B4DFF`           | Bingkai, ilustrasi, bidang dekoratif         |
| `action-purple`             | `#6D35CF`           | Tombol utama, tautan, ikon/fokus aktif       |
| `purple-hover`              | `#5927B2`           | Hover tombol utama                           |
| `purple-soft`               | `#F1EBFF`           | Menu aktif, chip netral, kartu penjelas      |
| `lime`                      | `#C7F43B`           | Hero, CTA alternatif, panel latihan unggulan |
| `lime-soft`                 | `#F1FAD7`           | Aksen kecil dan latar pendukung              |
| `canvas`                    | `#F8F7FC`           | Latar aplikasi                               |
| `surface`                   | `#FFFFFF`           | Kartu, form, halaman membaca                 |
| `ink`                       | `#25251F`           | Teks utama dan teks pada lime                |
| `muted`                     | `#646459`           | Deskripsi sekunder                           |
| `border`                    | `#E5E2ED`           | Pemisah dekoratif/kartu                      |
| `control-border`            | `#857E95`           | Batas kontrol input yang perlu dikenali      |
| `success-text / success-bg` | `#17724A / #EAF7EF` | Konfirmasi simpan                            |
| `notice-text / notice-bg`   | `#805400 / #FFF4D8` | Informasi perlu perhatian, simulasi          |
| `danger-text / danger-bg`   | `#A52C3D / #FFF0F2` | Kesalahan/hapus, bukan kategori siswa        |

Pasangan teks yang dihitung dari warna sRGB:

| Pasangan                       | Rasio perkiraan |
| ------------------------------ | --------------- |
| Putih pada action-purple       | 6,86:1          |
| Ink pada lime                  | 12,05:1         |
| Action-purple pada purple-soft | 5,90:1          |
| Muted pada putih               | 5,98:1          |
| Muted pada canvas              | 5,61:1          |
| Success-text pada success-bg   | 5,38:1          |
| Notice-text pada notice-bg     | 6,02:1          |
| Danger-text pada danger-bg     | 6,28:1          |

Tetap periksa kontras pada hasil akhir, termasuk opacity, overlay, hover, disabled, dan teks di atas ilustrasi. Gunakan teks gelap pada lime, bukan putih. Abu border dekoratif tidak menjadi satu-satunya batas input; kontrol memakai control-border atau perlakuan setara yang teruji. Tidak memakai gradasi sebagai latar teks utama.

### 2.2 Tipografi

Pilih **Plus Jakarta Sans** untuk judul dan isi; fallback `Arial, sans-serif`. Gunakan satu keluarga dengan beberapa bobot agar konsisten. Ini pilihan desain, bukan font yang diwajibkan proposal.

| Gaya           | Desktop  | Mobile   | Bobot/line-height         |
| -------------- | -------- | -------- | ------------------------- |
| Hero headline  | 64 px    | 36 px    | 700 / 1,08                |
| Judul halaman  | 36 px    | 28 px    | 700 / 1,2                 |
| Judul bagian   | 28 px    | 22 px    | 700 / 1,25                |
| Judul kartu    | 20 px    | 18 px    | 600 / 1,35                |
| Isi utama/form | 16 px    | 16 px    | 400 / 1,6                 |
| Label/tombol   | 14-16 px | 14-16 px | 600 / 1,4                 |
| Metadata       | 13 px    | 13 px    | 400-500 / 1,5             |
| Timer          | 64 px    | 56 px    | 700 / 1; tabular numerals |

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

## 3. Grid dan responsive behavior

| Konteks                | Frame acuan                            | Struktur                                                                |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------- |
| Landing desktop        | 1440 px lebar, tinggi mengikuti konten | Bingkai ungu 32 px; shell putih max 1376 px; konten max 1184 px         |
| Aplikasi siswa desktop | 1440 x 1024 acuan                      | Sidebar 240 px; main fleksibel, padding 40 px, konten max 1120 px       |
| Staf desktop           | 1440 x 1024 acuan                      | Sidebar 240 px; main padding 32 px; tabel fleksibel                     |
| Tablet                 | 834 px lebar                           | Sidebar siswa menjadi top navigation ringkas; konten 2 kolom bila cukup |
| Siswa mobile           | 390 x 844 acuan                        | Satu kolom, margin 20 px, empat bottom tabs                             |
| Minimum                | 320 px lebar                           | Label tetap terbaca, tanpa horizontal scroll halaman                    |

- Breakpoint desain: mobile < 768 px; tablet 768-1199 px; desktop >= 1200 px.
- Landing desktop: grid 12 kolom/gutter 24 px; hero teks 6 kolom, ilustrasi 5, jarak 1.
- Landing mobile: border ungu luar 8 px, radius shell 24 px; padding hero 24 px; ilustrasi turun di bawah teks.
- Aplikasi mobile tidak memakai bingkai ungu tebal. Permukaan canvas memenuhi layar agar ruang input cukup.
- Grafik/tabel staf menjadi kartu berlabel pada mobile; jangan mempertahankan tabel 9 kolom yang diperkecil.
- Konten panjang digulir alami. Frame 844/1024 adalah viewport acuan, bukan batas seluruh halaman.
- Safe-area bottom, nav, CTA tetap, dan bantuan diperhitungkan dalam padding konten.

## 4. Shell dan navigasi

### 4.1 Publik

Header desktop tinggi 80 px: wordmark kiri, tautan `Cara kerja / Aktivitas / Privasi` di tengah, `Butuh bicara?` dan tombol `Masuk` kanan. Header mobile: logo + Masuk, baris tautan dapat masuk menu. Tidak ada search e-commerce, telepon jualan, akun belanja, atau cart.

Footer: identitas singkat, Pustaka, Informasi data, Bantuan, serta teks `Pendamping layanan BK. Bukan layanan darurat.`

### 4.2 Siswa

Desktop sidebar: logo, **empat menu utama** `Beranda / Tenang / Catat / Refleksi`; bagian terpisah `Rencana / Pustaka / Pengingat`; bantuan di bagian bawah sidebar; profil samaran dan Pengaturan di footer sidebar.

Mobile: empat tab bawah yang sama, ikon + label selalu tampak, tinggi sekitar 72 px ditambah safe-area. Rencana, Pustaka, Pengingat melalui pintasan Beranda dan menu akun; jangan menambah tab kelima.

Mobile aplikasi memiliki tombol bantuan berbentuk pill berlabel `Butuh bicara?` pada header yang tetap terlihat saat scroll. Di layar sempit, header dua baris diperbolehkan: judul/back di baris pertama, bantuan di baris kedua. Jangan menaruhnya melayang di atas keyboard atau textarea.

Player boleh menyederhanakan header menjadi kembali + bantuan; bottom tabs tetap tersedia setelah keluar player. Saat keyboard membuka, nav/aksi tetap tidak menutupi input; bantuan tetap dapat ditemukan di header.

### 4.3 Guru BK

Sidebar: `Ringkasan / Permintaan bantuan / Umpan balik kelompok`. Header menampilkan label `Ruang guru BK`, sekolah contoh, akun. Tidak ada menu jurnal siswa, daftar skor individu, AI insights, atau daftar siswa berisiko.

Mobile staf memakai header dengan tombol menu; sidebar menjadi drawer. Tombol bantuan/informasi dukungan tetap berada di header, bukan nav empat tab siswa.

### 4.4 Admin

Sidebar: `Akun / Undangan / Penugasan / Konten / Pengaturan sekolah`. Label `Administrasi sekolah` selalu jelas. Tidak menampilkan kontrol beralih bebas menjadi siswa/guru; pemilih skenario hanya boleh ada pada papan demonstrasi terpisah.

## 5. Inventaris layar dan cakupan PRD

Ada **38 layar/papan kanonis**. Varian mobile, empty, error, serta modal memakai ID induk dengan akhiran, misalnya `S10-error`, bukan fitur baru.

| ID  | Layar                          | PRD           | Frame prioritas  |
| --- | ------------------------------ | ------------- | ---------------- |
| L01 | Landing publik                 | Pengenalan    | Desktop + mobile |
| A01 | Masuk                          | Akun          | Mobile + desktop |
| A02 | Aktivasi                       | Akun          | Mobile           |
| A03 | Pemulihan                      | Akun          | Mobile           |
| A04 | Informasi data dan persetujuan | F1            | Mobile + desktop |
| A05 | Verifikasi MFA staf            | Akun staf     | Desktop          |
| S01 | Beranda siswa                  | F2, F4-F9     | Mobile + desktop |
| S02 | Cek suasana hati               | F2            | Mobile           |
| S03 | Pengantar/status skrining      | F2            | Mobile           |
| S04 | Pertanyaan simulasi            | F2            | Mobile           |
| S05 | Ringkasan simulasi             | F2            | Mobile           |
| S06 | Pilihan latihan                | F4            | Mobile + desktop |
| S07 | Player latihan                 | F4            | Mobile           |
| S08 | Akhir latihan                  | F4            | Mobile           |
| S09 | Daftar jurnal                  | F3            | Mobile + desktop |
| S10 | Tulis/edit jurnal              | F3            | Mobile           |
| S11 | Rencana harian                 | F5            | Mobile + desktop |
| S12 | Tambah/edit tugas              | F5            | Mobile           |
| S13 | Refleksi dan riwayat           | F7            | Mobile + desktop |
| S14 | Pustaka                        | F8            | Mobile + desktop |
| S15 | Artikel                        | F8            | Mobile           |
| S16 | Pengingat                      | F6            | Mobile           |
| S17 | Pengaturan dan privasi         | F1, akun      | Mobile           |
| H01 | Bantuan publik                 | F9            | Mobile + desktop |
| H02 | Form bantuan                   | F9            | Mobile           |
| H03 | Pratinjau bantuan              | F9            | Mobile           |
| H04 | Status bantuan                 | F9            | Mobile           |
| B01 | Dasbor agregat guru            | F9            | Desktop + mobile |
| B02 | Antrean bantuan guru           | F9            | Desktop          |
| B03 | Detail/tindak lanjut bantuan   | F9            | Desktop          |
| B04 | Umpan balik kelompok           | F9            | Desktop          |
| N01 | Daftar akun admin              | Administrasi  | Desktop          |
| N02 | Undangan/aktivasi akun         | Administrasi  | Desktop          |
| N03 | Penugasan guru                 | Administrasi  | Desktop          |
| N04 | Daftar konten                  | F4, F8        | Desktop          |
| N05 | Editor/review konten           | F4, F8        | Desktop          |
| N06 | Pengaturan sekolah/kontak      | Administrasi  | Desktop          |
| V01 | Papan komponen dan state       | Seluruh fitur | Desktop          |

Untuk generate awal, prioritaskan L01, S01, S06, S10, S13, H02, B01, N01, kemudian lengkapi layar pendukung. Hasil akhir tetap mencakup semua fitur F1-F9.

## 6. Layout publik dan akses akun

### L01 - Landing publik

**Tujuan:** mengenalkan fungsi, memberi jalan masuk, dan menjelaskan privasi dengan gaya visual referensi.

Urutan desktop:

| Blok              | Layout                                              | Konten dan tindakan                                                                                               |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Header            | 80 px, konten 1184 px                               | Navigasi publik sesuai Bagian 4                                                                                   |
| Hero              | Panel lime radius 32, min-height 440 px, padding 48 | Eyebrow `Ruang jeda untuk hari belajarmu`; headline `Pelan-pelan, kamu boleh ambil jeda.`; kata `ambil jeda` ungu |
| Hero body         | Teks maks 480 px                                    | `Kenali perasaanmu, coba latihan singkat, dan susun langkah belajar yang terasa lebih ringan.`                    |
| Hero actions      | Dua tombol, wrap bila perlu                         | Utama ungu `Mulai dengan tenang` menuju A01; sekunder outline gelap `Lihat cara kerjanya` scroll                  |
| Hero illustration | Kanan 40%, overlap bawah maks 24 px                 | Awan original; dekorasi tidak melewati teks/CTA                                                                   |
| Trust note        | Di bawah hero                                       | Ikon lock + `Catatan pribadi tetap milikmu.`; tautan `Pelajari privasi`                                           |
| Cara kerja        | Judul terpusat, dua kartu, empat langkah            | Kartu `Kenali dirimu` lavender dan `Temukan jedamu` putih; langkah Kenali, Catat, Latih, Refleksi                 |
| Aktivitas         | Bidang lavender, split 4/8 kolom                    | Kiri judul `Ruang kecil untuk merawat harimu.` + `Jelajahi aktivitas`; kanan grid 2x2                             |
| Empat kartu       | Putih, ikon kecil, radius 24                        | `Cek perasaan / Latihan singkat / Catat pikiran / Atur rencana`; deskripsi satu kalimat; tautan masuk/fitur       |
| Privasi           | Putih, dua kolom 1:1                                | Kiri judul `Kamu punya kendali atas ceritamu.`; kanan 3 baris: izin, catatan pribadi, ringkasan kelompok          |
| CTA bantuan       | Panel lime-soft                                     | `Ingin bicara dengan seseorang?`; `Lihat jalur bantuan` menuju H01                                                |
| Footer            | Putih, divider ringan                               | Tautan publik dan batas layanan                                                                                   |

Jarak antarbagian 80-96 px desktop, 48-64 px mobile. Mobile: hero teks -> CTA bertumpuk -> ilustrasi; kartu menjadi satu kolom; empat langkah menjadi daftar vertikal, tanpa garis timeline panjang mendatar. Teks hero mobile tidak tertutup ilustrasi.

Tidak ada statistik kesembuhan, testimoni rekaan, rating medis, harga, bonus, atau CTA konsultasi instan.

### A01 - Masuk

Desktop dua kolom: panel kiri 45% lavender dengan headline `Ruang jedamu ada di sini.` dan awan kecil; kanan form putih maksimal 420 px. Logo di atas; bantuan publik di kanan header. Mobile hanya form + ilustrasi kecil opsional.

Urutan: judul `Masuk ke Tenangin.id` -> helper `Gunakan kode akun dari sekolahmu.` -> Kode akun -> Kata sandi dengan tampil/sembunyi -> tautan pemulihan -> tombol `Masuk` -> tautan `Punya kode aktivasi?`. Tidak ada pilihan peran yang memberi hak akses; peran berasal dari akun.

States: loading tombol; kombinasi kredensial salah dengan pesan netral; rate-limit; sesi berakhir. Submit sukses menuju A04 jika belum setuju, S01 untuk siswa, A05 lalu B01/N01 untuk staf yang membutuhkan MFA.

### A02 - Aktivasi

Form maksimum 440 px: `Aktifkan akunmu`, token aktivasi, kode akun bila diwajibkan alur, kata sandi baru, konfirmasi, tombol `Aktifkan akun`. Helper `Kode aktivasi hanya digunakan untuk mengaktifkan akun.`

Varian token salah/kedaluwarsa memberi jalan ke informasi admin sekolah, tanpa menampilkan rahasia lain. Varian izin wali menunggu menampilkan `Menunggu verifikasi yang diperlukan sekolah` serta tetap menyediakan bantuan/pustaka. Jangan mengumpulkan identitas wali lewat formulir baru.

### A03 - Pemulihan

Panel ringkas: judul `Pulihkan akses akun`, input kode akun, penjelasan prosedur sekolah, tombol `Lanjutkan pemulihan`. Layar hasil selalu netral, misalnya `Ikuti prosedur pemulihan yang disediakan sekolahmu.` Tidak menyatakan kode tertentu terdaftar/tidak. Untuk prototype, sediakan varian set sandi baru dari token sah dan status token kedaluwarsa.

### A04 - Informasi data dan persetujuan

Halaman membaca maksimal 760 px desktop. Mobile satu kolom dengan judul `Sebelum mulai, kenali ruangmu.`

1. Ringkasan pendek tujuan dan batas layanan.
2. Tiga kartu: `Apa yang disimpan?`, `Siapa yang dapat melihat?`, `Apa yang bisa kamu kendalikan?`.
3. Rincian accordion: jenis data, penggunaan, akses, penghapusan/retensi, bantuan/pengaduan. Nilai kebijakan yang belum disahkan diberi label contoh, bukan angka sah yang dikarang.
4. Callout `Jurnalmu tidak dipantau sebagai layanan darurat.` dan tautan H01.
5. Versi kebijakan contoh, checkbox kosong `Saya sudah membaca dan memahami penjelasan ini.`.
6. Tombol `Setuju dan lanjut` dan alternatif setara terlihat `Belum ingin menyetujui`.

Menyetujui menuju S02 yang dapat dilewati; menolak menuju pustaka/bantuan publik. Tidak memakai checkbox notifikasi di formulir persetujuan. Form tidak memaksa scroll palsu untuk menandai setuju.

### A05 - MFA staf

Panel 420 px: judul `Verifikasi akses staf`, penjelasan, satu input kode aksesibel yang divisualkan menjadi enam slot, tindakan `Verifikasi`, helper pemulihan sesuai prosedur sekolah. Varian salah/kedaluwarsa tidak menghapus seluruh konteks akun. Setelah berhasil menuju ruang peran yang benar.

## 7. Layout aplikasi siswa

### S01 - Beranda

**Desktop:** heading + tanggal -> banner pendek lime -> grid dua kolom dengan proporsi 7:5. Kolom kiri berisi mood dan rencana; kanan latihan/pengingat dan pesan kelompok. Sidebar sesuai Bagian 4.

**Mobile:** header logo/kode samaran + bantuan -> sapaan -> banner -> mood -> kartu latihan -> pintasan -> rencana hari ini -> refleksi -> pesan kelompok -> bottom tabs.

Konten:

- Sapaan `Halo, Awan-028.`; subteks `Kamu boleh mulai dari hal kecil hari ini.`.
- Banner lime tinggi sekitar 180 px desktop/160 px mobile, judul `Ada ruang untuk jeda.`, CTA `Coba latihan 3 menit`, awan kecil kanan.
- Card mood: `Bagaimana perasaanmu hari ini?`, lima ikon wajah monoline dengan label. Pilihan di Beranda membuka S02 dengan pilihan dibawa, belum otomatis menyimpan.
- Pintasan `Rencana / Pustaka / Pengingat` berupa tiga tile kompak.
- Rencana: maksimal tiga tugas, seperti `Baca ringkasan Biologi`; checkbox, estimasi opsional, `Lihat rencana`.
- Refleksi: `Luangkan waktu untuk melihat minggu ini.`, CTA `Buka refleksi`.
- Umpan balik: label `Pesan kelompok dari guru BK`, satu pesan pendek satu arah.

Mood tersimpan berubah menjadi ringkasan pilihan dan tautan `Ubah`. Jangan menampilkan streak, skor kesehatan gabungan, leaderboard, atau akumulasi jam sebagai target.

### S02 - Cek suasana hati

Satu form terpusat maksimum 680 px. Judul `Bagaimana perasaanmu hari ini?`; tanggal lokal; helper `Tidak ada jawaban yang harus kamu pilih. Kamu boleh melewati ini.`

Lima radio card: `Berat sekali / Berat / Biasa saja / Cukup nyaman / Nyaman`. Wajah berbeda ekspresi, tanpa warna merah-hijau yang memberi nilai baik/buruk. Terpilih memakai border ungu 2 px, latar purple-soft, check kecil; label tetap terlihat.

Mobile lima pilihan boleh satu baris jika target sentuh/label cukup; pada 320 px susun 3+2 tanpa mengurangi ukuran teks. Di bawahnya bagian opsional `Seberapa kuat tekanan yang kamu rasakan?` slider 0-10 dengan nilai teks dan cara input aksesibel. Label `Penilaian pribadi, bukan skor skrining`.

Tindakan: `Simpan perasaan`, `Lewati dulu`. Tidak ada textarea wajib, lampiran, atau tombol kirim ke guru. Sukses menampilkan `Tersimpan untuk hari ini.` dan pilihan kembali/latihan.

### S03 - Pengantar/status skrining

Gunakan badge notice `Simulasi prototype`, judul `Kenali tekanan belajarmu`, penjelasan pendek bahwa instrumen nyata menunggu penetapan ahli.

Dua varian:

- **Default belum tersedia:** callout `Instrumen belum tersedia.`; tombol `Kembali ke Beranda` dan `Lihat pustaka`. Jangan menampilkan tombol mulai aktif.
- **Demo alur:** label `Contoh tata letak, bukan alat penilaian`; CTA `Lihat simulasi tampilan` menuju S04; tautan lewati.

Slot metadata instrumen disiapkan, tetapi nama instrumen, jumlah item, durasi, lisensi, atau periode rujukan nyata tidak dibuat sendiri.

### S04 - Pertanyaan simulasi

Panel putih maksimum 680 px. Badge simulasi selalu terlihat. Progres bertuliskan `Contoh 1 dari 3` untuk fixture UI, tidak disebut jumlah item instrumen nyata.

Heading `Contoh pernyataan untuk menguji tata letak.`; empat radio row berlabel `Pilihan contoh A / B / C / D`. Ini menguji komponen, bukan menyamarkan pertanyaan kesehatan yang belum divalidasi.

Footer form: kembali, lanjut, dan tautan `Keluar dari simulasi`. Jawaban tidak dipilih otomatis. State kosong menampilkan petunjuk netral, bukan nilai nol.

### S05 - Ringkasan simulasi

Ikon lingkaran sederhana, heading `Simulasi selesai.`, penjelasan `Ini hanya contoh tampilan, bukan penilaian kondisi dirimu.` Tidak ada angka skor, meter risiko, label gangguan, warna alarm, atau saran otomatis berdasarkan jawaban.

Tombol `Kembali ke Beranda`, sekunder `Jelajahi latihan`, bantuan tetap ada. Untuk implementasi instrumen sah kelak, sediakan area deskripsi hasil yang akan diisi naskah disahkan; jangan tampilkan placeholder teknis itu pada mockup pengguna.

### S06 - Pilihan latihan

Heading `Pilih jeda yang cocok untukmu.`, helper `Latihan singkat. Kamu bisa berhenti kapan saja.`

Featured card lime, horizontal desktop: `Jeda 3 menit`, ilustrasi lingkaran/awan sederhana, CTA `Lihat latihan`. Di bawahnya tiga kartu putih/lavender: `Latihan napas / Relaksasi otot / Mindfulness`, durasi 3-5 menit, ikon, satu kalimat penjelas, CTA `Mulai`.

Desktop tiga kolom; mobile vertikal. Semua akses ke latihan melalui satu player konsisten; label contoh protokol belum disahkan ditandai pada demo, tidak berisi panduan medis buatan.

### S07 - Player latihan

Layout fokus maksimum 640 px: header kembali + bantuan; judul jenis; durasi; lingkaran lavender besar 220 px desktop/180 px mobile; timer tabular; satu instruksi teks yang ditinjau; progress linear tipis; tombol utama `Jeda`; tindakan `Berhenti` selalu terlihat; pengaturan audio opsional dan tautan `Gunakan panduan teks`.

Animasi lingkaran hanya petunjuk tambahan, dapat statis. Mode jeda mengganti instruksi dengan `Latihan dijeda.` dan tombol `Lanjutkan`. Berhenti lebih awal membuka S08 dengan pesan netral. Jangan meletakkan bantuan atau berhenti sebagai ikon kecil tersembunyi.

### S08 - Akhir latihan

Dua varian visual sama:

- Selesai: `Terima kasih sudah meluangkan waktu.`.
- Berhenti: `Latihan dihentikan. Kamu bisa kembali kapan pun.`.

Tampilkan jenis/durasi sebagai metadata biasa, bukan medal/poin. Tindakan `Kembali ke Beranda` dan `Catat pengalamanmu` menuju S10. Tidak ada kewajiban menilai mood sesudah latihan atau klaim perubahan emosi.

### S09 - Daftar jurnal

Header `Ruang catatmu` dan CTA `Tulis jurnal`. Helper lock `Catatan ini hanya untukmu di aplikasi.` Filter waktu sederhana milik sendiri; list kartu berisi tanggal, ringkasan situasi pendek yang hanya terlihat pemilik, label `Pribadi`, menu edit/hapus.

Desktop lebar list maksimal 880 px; mobile kartu vertikal. Empty state ilustrasi kertas kecil + `Belum ada catatan. Mulai saat kamu ingin.`, CTA sama. Tidak ada jumlah jurnal wajib atau progress harian.

### S10 - Tulis/edit jurnal

Desktop split 8:4: formulir putih di kiri, panel lavender kanan berisi contoh realistis yang dapat ditutup. Mobile satu kolom, contoh menjadi accordion opsional.

Judul `Ceritakan sedikit, sesuai nyamanmu.`; catatan privasi; empat field berlabel:

1. `Apa yang terjadi?`, helper `Tuliskan situasinya secara singkat.`.
2. `Apa yang terlintas di pikiranmu?`.
3. `Apa yang kamu rasakan?`.
4. `Adakah cara lain melihat situasi ini? (opsional)`, tombol `Lihat contoh`.

Textarea minimum 112 px; counter misalnya `0/2.000`; tiga pertama inti, keempat opsional. CTA `Simpan jurnal`, sekunder `Kembali`; editor tersimpan memiliki menu hapus dengan konfirmasi. Tidak ada tombol bagikan guru, AI analisis, unggah, atau komentar.

States: menyimpan; sukses eksplisit; gagal dengan `Belum tersimpan. Coba lagi.` dan input tetap; keluar belum simpan dengan `Simpan / Buang perubahan / Tetap di sini`; konflik dua tab tanpa menimpa diam-diam.

### S11 - Rencana harian

Heading `Satu langkah dulu.`, subteks `Bagi tugas besar jadi bagian yang bisa dikerjakan.`. Desktop dua kolom: daftar 8 kolom, ringkasan tanggal/blok istirahat 4 kolom. Mobile daftar terlebih dahulu.

Date strip ringkas dengan tanggal lengkap terbaca; CTA `Tambah tugas`. Section `Hari ini / Berikutnya / Belum dijadwalkan`; tiap tugas: judul, langkah selesai, tag `Penting` dan/atau `Mendesak`, estimasi opsional, menu. Tanggal lewat menggunakan `Atur ulang tanggal` dengan warna netral.

Blok istirahat/tidur merupakan jadwal pribadi yang dapat ditambah, tanpa target durasi otomatis. Tidak ada kalender bulanan padat atau matriks empat kuadran sebagai layar pertama.

### S12 - Tambah/edit tugas

Desktop dialog 560 px; mobile halaman penuh agar keyboard tidak menutupi aksi. Field judul, tanggal opsional, estimasi opsional, switch `Penting` dan `Mendesak`, daftar langkah dengan `Tambah langkah`. Tindakan `Simpan tugas` dan batal. Jangan memakai dua switch sebagai penilaian tingkat stres.

Varian tambah blok istirahat memakai tipe/jam, bukan field tugas dipaksa. Hapus membuka dialog; menandai selesai dapat dibatalkan.

### S13 - Refleksi dan riwayat

Heading `Lihat kembali minggu ini.`, periode `16-22 November 2026`, helper `Tidak perlu sempurna. Cukup ceritakan yang terasa penting.`

Desktop form 8 kolom + riwayat 4 kolom. Mobile form satu kolom; riwayat sebagai bagian setelah form. Tiga textarea `Apa yang membantumu? / Apa hambatannya? / Apa rencana kecilmu berikutnya?`; tag strategi opsional terpisah; CTA `Simpan refleksi`.

Badge privasi, edit/hapus riwayat milik sendiri. Tidak ada kutipan jawaban pada ruang guru. Empty state tetap memperbolehkan menulis meskipun belum ada latihan.

### S14 - Pustaka

Heading `Pahami dirimu, pelan-pelan.`, search judul/topik dengan label aksesibel; chip `Semua / Stres belajar / Emosi / Rencana / Istirahat / Mencari bantuan`. Desktop grid 3 kolom, mobile satu kolom.

Kartu punya ilustrasi geometris kecil, kategori, judul pendek, ringkasan 2 baris, CTA `Baca`. Materi sama dapat diakses tanpa login melalui shell publik. Tidak ada tracking/indikator riwayat pribadi yang dibuat sekadar dekorasi.

### S15 - Artikel

Kolom baca max 720 px; breadcrumb/kembali; kategori; judul; metadata peninjau/tanggal/sumber contoh yang jelas berstatus demo; paragraf 16 px; subjudul; daftar langkah; callout bantuan. Gambar tidak wajib.

Footer artikel menampilkan sumber, tautan topik, `Butuh bicara?`. Jangan mengarang nama ahli nyata atau cap "tervalidasi" pada konten demo.

### S16 - Pengingat

Heading `Atur pengingat sesuai ritmemu.`, switch utama **OFF**. Helper `Pengingat ini muncul saat aplikasi dibuka atau aktif.`. Pilihan jenis, hari, jam, zona waktu sekolah, jam tenang; nonaktif ketika switch mati tetapi label tetap terbaca.

Tombol `Simpan pengaturan`. Tidak memunculkan browser permission modal pada baseline. Varian push lanjutan dipisahkan dan diberi keterangan; jangan memberi label notifikasi ponsel aktif secara default. Preview teks generik `Ada waktu untuk jeda singkat?`.

### S17 - Pengaturan dan privasi

Group kartu: `Akun / Preferensi / Privasi dan data`. Menampilkan kode samaran, ubah sandi, pengingat, informasi izin versi, tautan kebijakan, tarik persetujuan, hapus akun. Ekspor ditandai lanjutan jika belum scope prototype, bukan tombol yang seolah berfungsi.

Tarik persetujuan memakai konfirmasi deskriptif dan pilihan batal. Hapus akun memakai konfirmasi terpisah, autentikasi ulang, serta status permintaan; warna merah hanya pada tindakan destruktif. Jangan menaruh hapus sejajar sebagai primary dengan simpan biasa.

## 8. Layout bantuan

### H01 - Bantuan publik

Heading `Kamu boleh mencari dukungan.`. Panel putih utama untuk guru BK/sekolah, panel lavender untuk orang dewasa tepercaya, dan callout batas layanan. Tampilkan jam/kontak hanya bila dikonfigurasi/terverifikasi; pada demo tulis `Kontak sekolah belum diatur`, bukan nomor rekaan yang dapat ditelepon.

Copy batas: `Tenangin.id bukan layanan darurat dan permintaan di sini tidak dipantau setiap saat.`. CTA masuk untuk permintaan pribadi; materi bantuan tetap terbaca tanpa akun. Tidak perlu widget chat atau daftar hotline hasil tebakan.

### H02 - Form bantuan

Heading `Ingin bicara dengan guru BK?`. Form max 680 px: kartu penerima `Bu Rani - Guru BK (contoh)` dengan jam layanan berlabel contoh; select guru jika ada beberapa; topik/pesan opsional; cara dihubungi opsional; penjelasan data yang akan dibagi; CTA `Tinjau permintaan`.

Jangan meminta jurnal/skrining sebagai syarat. Varian guru belum tersedia mengganti form kirim dengan informasi kontak/prosedur, bukan tombol kirim aktif.

### H03 - Pratinjau

Judul `Periksa sebelum mengirim.`; ringkasan kode samaran, guru tujuan, pesan/kontak yang dipilih, jam layanan. Callout `Jurnal, refleksi, dan hasil skrining tidak ikut dikirim.`

Tindakan `Kirim permintaan` dan `Ubah dulu`. Siswa memiliki kendali jelas; belum ada status berhasil sebelum kirim.

### H04 - Status

Heading `Permintaanmu tersimpan.`; teks `Terkirim berarti tersimpan di sistem, belum tentu sudah dibaca.`. Ringkasan penerima, waktu, status chip, daftar event vertikal. Label tahap: `Terkirim -> Diterima -> Ditindaklanjuti -> Selesai`, dengan varian Dibatalkan.

Respons administratif guru berupa satu kartu `Tanggapan guru BK`. Tanpa kolom balas/chat bubble/titik online. CTA `Kembali ke Beranda` dan `Batalkan permintaan` sebelum selesai. Error kirim mempertahankan isi dan tombol retry tanpa menambah kasus baru.

## 9. Layout guru BK dan admin

### B01 - Ringkasan agregat

Header `Ringkasan kelompok`, `Sekolah Contoh`, periode tetap `9-15 November 2026`, metadata `Snapshot minggu selesai • Data contoh`. Pemilih hanya minggu kalender yang sudah ditutup; tanpa filter individu/kelas/gender atau rentang bebas.

Grid desktop:

- Baris 1: empat metric card: `Pengguna aktif 8`, `Mengisi refleksi 6`, `Menuntaskan latihan 5`, `Skor skrining: Belum tersedia`.
- Baris 2: grafik lavender `Ringkasan suasana hati kelompok` dengan sumbu/legenda teks, dan kartu `Tren strategi` berisi state data belum cukup bila kategori tidak aman.
- Baris 3: panel penjelasan agregat + CTA `Buka permintaan bantuan` dengan jumlah antrean administratif.
- Footer catatan `Ringkasan kelompok tidak menunjukkan kondisi setiap siswa dan bukan diagnosis.`.

Semua angka murni dataset ilustratif, bukan statistik Tenangin.id nyata. Jangan menggambar trend penurunan stres yang menyiratkan efek. Jika memakai seri mood, labelkan `Skala pilihan suasana hati internal` dan tampilkan definisi, bukan persen kesembuhan.

Varian supresi: ganti nilai/grafik dengan teks `Data belum cukup untuk ditampilkan`. Jangan tampilkan jumlah 1-4 di tooltip/legend atau memberi total yang mengungkap kategori tersembunyi. Tidak ada daftar siswa, judul jurnal, tombol buka profil kesehatan, atau AI ringkasan.

Mobile: empat metrik jadi grid 2x2, grafik satu kolom, antrean sebagai CTA. Grafik punya ringkasan teks, tidak mengharuskan hover.

### B02 - Antrean bantuan

Heading `Permintaan bantuan`; filter status, daftar kasus hanya yang ditugaskan. Kolom: `Kode permintaan / Kode samaran / Dikirim / Status / Tindakan`. Nama/kode muncul di sini karena siswa sengaja mengirim bantuan, bukan sebagai drill-down metrik.

Tindakan `Lihat permintaan` menuju B03. Tanpa kolom skor, tingkat risiko, atau cuplikan jurnal. Empty state `Belum ada permintaan untukmu.`. Mobile konversi kartu berlabel.

### B03 - Detail bantuan

Desktop 8:4: kiri pesan yang sukarela dikirim dan satu respons administratif; kanan ringkasan penerima/waktu/status + timeline. Judul kode kasus fiktif `BNT-024`, kode siswa `Awan-028`.

Tombol sesuai status: `Tandai diterima`, `Catat tindak lanjut`, `Tandai selesai`. Field respons administratif ringkas, seperti usulan prosedur pertemuan di sekolah, tidak membuat percakapan terapi. Konfirmasi perubahan status; riwayat edit terlihat bagi pihak berwenang.

Tidak menyediakan lampiran jurnal, tombol seluruh riwayat siswa, atau panel penilaian otomatis.

### B04 - Umpan balik kelompok

List pesan terbit dan tombol `Buat pesan`; editor judul opsional, kelompok tujuan sesuai penugasan, isi, pratinjau, `Simpan draf` dan `Terbitkan`. Contoh: `Minggu ini, kamu boleh mencoba membagi satu tugas besar menjadi langkah kecil.`

Callout `Pesan ditujukan untuk kelompok. Hindari menyebut siswa atau catatan pribadi.`. Pratinjau menggunakan kartu yang sama dengan S01. Tidak ada komentar/reply.

### N01 - Daftar akun

Header `Akun sekolah`; badge peran admin; search kode akun; filter peran/status. Tabel kolom `Kode akun / Peran / Status aktivasi / Status akun / Aksi`. Tidak ada skor, mood, kelas risiko, jurnal, atau statistik emosi.

CTA `Buat undangan` menuju N02. Aksi row: detail administratif, nonaktifkan, mulai prosedur pemulihan. Tidak ada `Masuk sebagai siswa`, tombol lihat jurnal, atau kontrol menjadikan akun admin sendiri sebagai guru. Konfirmasi nonaktif menjelaskan dampak akses.

### N02 - Undangan

Form maksimal 680 px: peran yang diizinkan, jumlah/kode akun samaran, masa berlaku contoh yang dapat dikonfigurasi, tombol `Buat undangan`. Hasil menampilkan token contoh sekali tampil dan cara distribusi sekolah; badge `Data contoh`.

Jangan menampilkan sandi siswa. Pengiriman pesan ke pihak luar bukan aksi prototype. Status kedaluwarsa/nonaktif memiliki langkah penggantian token melalui alur admin.

### N03 - Penugasan

List guru aktif dan cakupan sekolah/kelompok yang sah, periode penugasan, status. Dialog tambah/edit memuat guru, cakupan, tanggal mulai/akhir. Helper `Penugasan menentukan akses permintaan dan ringkasan kelompok.`

Penugasan ulang bantuan memakai alasan serta pemberitahuan kepada siswa dalam spesifikasi interaksi. Jangan menjadikan kontrol ini sebagai pembuka catatan siswa.

### N04 - Daftar konten

Tabs `Artikel / Latihan`; filter `Draf / Ditinjau / Disetujui / Terbit / Arsip`; search judul. Tabel judul, jenis, versi, status, peninjau/referensi, tanggal, aksi. CTA `Tambah konten` menuju N05.

Status materi demo tidak diberi cap validasi nyata. Versi terbit dan draf dibedakan jelas, bukan hanya warna.

### N05 - Editor/review konten

Desktop 8:4: editor kiri, panel status/sumber/review kanan. Field judul, jenis/topik, isi, durasi jika latihan, audio opsional, sumber/hak pakai, referensi persetujuan, pratinjau.

Aksi bergantung status: `Simpan draf`, `Ajukan tinjauan`, `Terbitkan versi disetujui`. Konten belum disetujui tidak punya tombol terbit aktif. Perubahan substansi membuat versi draf baru. Admin tidak dapat memberi cap ahli pada diri sendiri tanpa penugasan/prosedur.

### N06 - Pengaturan sekolah

Group `Identitas / Zona waktu / Jam layanan / Kontak bantuan / Kebijakan data`. Zona contoh `Asia/Jakarta` diberi label sekolah contoh; kebijakan wali dan versi persetujuan jelas. Kontak tanpa verifikasi menampilkan `Belum diverifikasi`; tidak dipublikasikan sebagai kontak siap pakai.

Tindakan `Simpan perubahan`, ringkasan dampak untuk perubahan kebijakan. Jangan menaruh field teknis database/API secret dalam flow pengguna admin sekolah.

### V01 - Papan komponen/state

Papan referensi desain, bukan halaman aplikasi. Susun kolom warna/tipografi, tombol/input, card/nav, serta states. Tampilkan button primary/secondary/disabled/loading, field default/focus/error, mood selected, chip status, empty, notice simulasi, supresi agregat, toast simpan, dialog keluar, dialog hapus.

Papan inilah tempat menampilkan label ID layar, catatan ukuran, contoh role, dan anotasi prototype. Jangan memindahkannya ke produk pengguna.

## 10. Komponen dan aturan interaksi

| Komponen         | Default                                        | State/aturan                                                          |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Primary button   | Action-purple, putih, radius 14, tinggi 48     | Hover lebih gelap, focus ring jelas, loading dengan label             |
| Lime CTA         | Ink pada lime                                  | Terutama landing; jangan pakai putih pada lime                        |
| Secondary button | Putih, border ungu, teks ungu                  | Batal/lewati tidak dibuat samar                                       |
| Input/textarea   | Label di atas, helper di bawah, border kontrol | Error ikon+teks; placeholder bukan label                              |
| Mood choice      | Ikon+wajah+teks                                | Selected border 2 px+check; tidak pakai warna saja                    |
| Card aktivitas   | Radius 24, padding 24                          | Satu aksi utama; seluruh kartu hanya satu tautan jika memang navigasi |
| Privacy note     | Lock kecil + teks                              | Tidak menyatakan 100% anonim                                          |
| Status chip      | Label jelas                                    | Terkirim/diterima/selesai berbeda teks, bukan warna saja              |
| Table            | Header solid ringan, row 56-64 px              | Aksi berlabel; mobile kartu                                           |
| Toast/status     | Dekat konteks, dapat diumumkan pembaca layar   | Tidak menutupi bantuan/nav; kesalahan penting juga inline             |
| Dialog           | Judul, dampak, tombol jelas                    | Focus dikelola, Esc bila aman, kembali ke pemicu                      |
| Help control     | Pill berlabel                                  | Konsisten, tersedia sebelum login, tidak tertutup CTA                 |

### 10.1 States yang harus tergambar

| State                  | Tampilan                                         | Tindakan                                          |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------- |
| Loading                | Skeleton ukuran mirip konten, tanpa angka fiktif | Jangan ganti label bantuan dengan skeleton        |
| Kosong                 | Ilustrasi kecil + pesan yang spesifik            | Satu langkah yang relevan                         |
| Berhasil simpan        | Status `Tersimpan` di konteks                    | Tidak perlu popup per field                       |
| Gagal simpan           | `Belum tersimpan. Coba lagi.`                    | Pertahankan input, retry                          |
| Offline                | Banner ringan dan status simpan jelas            | Baca publik bila tersedia; jangan klaim auto-sync |
| Sesi habis             | Pesan netral + masuk ulang                       | Tidak membuka data di akun berikutnya             |
| Tidak berizin          | `Halaman ini tidak dapat diakses.`               | Kembali ke ruang peran                            |
| Izin belum aktif       | Informasi data/persetujuan                       | Setuju atau bantuan/pustaka publik                |
| Skrining belum siap    | Notice tanpa angka                               | Beranda/pustaka, bukan mulai aktif                |
| Agregat tersupresi     | `Data belum cukup untuk ditampilkan`             | Penjelasan ringkas, tanpa jumlah tersembunyi      |
| Belum ada guru         | `Jalur permintaan belum tersedia`                | Informasi sekolah, tanpa form kirim palsu         |
| Perubahan belum simpan | Dialog tiga pilihan                              | Simpan, buang, tetap                              |
| Hapus                  | Konfirmasi spesifik                              | Batal jelas, hapus destruktif                     |

### 10.2 Aksesibilitas dan gerak

Mengikuti target PRD: keyboard penuh, fokus terlihat/tidak tertutup, kontras, label programatis, error terkait input, zoom teks 200%, reflow 320 px, padanan teks audio, ringkasan grafik. Gerak transisi cukup 120-180 ms untuk hover/panel; reduced motion meniadakan animasi non-esensial. Timer/lingkaran tidak berkedip. Tidak memakai konfeti, shake saat error, atau bunyi notifikasi mengejutkan.

Dialog tidak boleh menjadi satu-satunya jalan membaca bantuan. Teks kebijakan dan artikel tidak dimasukkan ke kotak scroll kecil bersarang pada mobile.

## 11. Dataset contoh dan konsistensi

| Elemen                 | Nilai contoh                                                       |
| ---------------------- | ------------------------------------------------------------------ |
| Sekolah                | Sekolah Contoh                                                     |
| Siswa                  | Awan-028                                                           |
| Guru                   | Bu Rani - Guru BK (contoh)                                         |
| Tanggal Beranda        | Jumat, 20 November 2026                                            |
| Minggu refleksi siswa  | 16-22 November 2026                                                |
| Snapshot guru          | 9-15 November 2026, minggu selesai                                 |
| Aktif/refleksi/latihan | 8 / 6 / 5 siswa, seluruhnya data ilustratif                        |
| Skrining guru          | Belum tersedia                                                     |
| Permintaan             | BNT-024, tanpa isi pribadi lain terlampir                          |
| Tugas                  | Baca ringkasan Biologi; susun tiga poin presentasi                 |
| Materi                 | Mengenali tekanan belajar; memberi nama perasaan; meminta dukungan |

Mockup pribadi/staf menampilkan label kecil `Mode contoh` yang rapi. Layar skrining tetap memiliki label simulasi eksplisit. Nomor kontak, institusi, peninjau, sertifikasi, manfaat, dan statistik nyata tidak dikarang.

Jurnal contoh singkat boleh berisi situasi belajar fiktif dan tidak perlu menampilkan cerita sensitif. Kode/judul tugas hanya tampil di ruang pemilik atau kasus bantuan yang sengaja dikirim. Jangan membawa jurnal ke dashboard guru sekadar agar layout terlihat terisi.

## 12. Alur prototype dan cakupan

| Skenario      | Urutan layar                                             | Hasil yang diuji secara visual                   |
| ------------- | -------------------------------------------------------- | ------------------------------------------------ |
| Pengguna baru | L01 -> A01 -> A02 bila perlu -> A04 -> S02/lewati -> S01 | Persetujuan jelas dan aktivitas sukarela         |
| Menolak izin  | A04 -> H01 atau S14 shell publik                         | Bantuan/materi tetap tersedia                    |
| Mood          | S01 -> S02 -> S01 state tersimpan                        | Pilihan tidak otomatis dikirim guru              |
| Skrining demo | S03 -> S04 -> S05 -> S01                                 | Simulasi jelas, tanpa skor karangan              |
| Latihan       | S01/S06 -> S07 ready/running/paused -> S08               | Mulai/jeda/lanjut/berhenti tersedia              |
| Jurnal        | S09 -> S10 -> S09                                        | Simpan, edit, error, hapus, keluar belum simpan  |
| Rencana       | S11 -> S12 -> S11                                        | Pecah langkah, prioritas, tanpa tanggal, selesai |
| Refleksi      | S13 form -> tersimpan -> riwayat/edit                    | Tiga pertanyaan dan privasi                      |
| Pustaka       | S14 -> S15 -> H01 bila diperlukan                        | Materi publik terbaca                            |
| Pengingat     | S16 off -> on -> simpan -> off                           | Kendali pengguna dan batas kanal                 |
| Bantuan siswa | H01 -> A01 bila perlu -> H02 -> H03 -> H04               | Preview, kirim, status, batal                    |
| Guru          | A01 -> A05 -> B01 -> B02 -> B03 -> B04                   | Agregat terpisah dari bantuan                    |
| Admin         | A01 -> A05 -> N01 -> N02/N03/N04/N05/N06                 | Administrasi tanpa catatan pribadi               |
| Privasi       | S17 -> tarik izin / hapus -> publik                      | Dampak dan konfirmasi terpisah                   |

Saat UI baru berupa mockup statis, panah ini menjadi spesifikasi transisi untuk perakitan prototype. Jangan mengklaim backend, pengiriman bantuan, atau penghapusan data sudah berjalan karena layarnya tersedia.

## 13. Prompt siap pakai untuk Stitch

### 13.1 Cara menggunakan brief

1. Berikan gambar referensi ungu-lime yang sama sebagai konteks visual.
2. Mulai dengan **prompt master** di bawah, kemudian **Batch 1**.
3. Tentukan layar acuan yang disukai sebelum melanjutkan, terutama L01 dan S01.
4. Untuk batch berikutnya, sertakan master dan layar acuan yang sudah dipilih. Pertahankan token, komponen, label, dan shell.
5. Setiap batch adalah kelompok brief; layar dapat dibuat satu per satu mengikuti ID jika hasil beberapa layar sekaligus kurang konsisten.
6. Detail Bagian 6-10 menjadi sumber koreksi. Jangan meminta seluruh 38 layar sekaligus lalu membiarkan setiap layar memakai gaya berbeda.
7. Setelah layar prioritas selesai, buat varian desktop/mobile dan state dari komponen yang sama.

Prompt ditulis dalam bahasa Inggris sebagai instruksi desain; **seluruh teks yang terlihat pada UI tetap Bahasa Indonesia**. Berikan konteks yang diperlukan secara eksplisit, termasuk salinan brief, gambar, dan layar acuan; jangan hanya menyebut nama file lokal.

### 13.2 Prompt master

```text
Design a coherent responsive WEBSITE UI prototype for TENANGIN.ID, an Indonesian
school counseling companion for students in grades X-XI, with separate counselor
and school-admin areas. All visible UI copy must be in natural Bahasa Indonesia.
Use the supplied reference for visual composition, not its business or content.

VISUAL DIRECTION
An airy white rounded website canvas, vivid purple framing, lime feature panels,
strong dark typography, soft lavender sections, generous whitespace, clean flat
cards, and a small original purple cloud illustration. Mature enough for high
school students and school staff. Create a distinctive website interface with
clear content hierarchy. Use the reference's large lime hero and asymmetric
illustration only where they support the task.

TOKENS
Decorative purple #8B4DFF; primary action #6D35CF; hover #5927B2;
lavender #F1EBFF; lime #C7F43B; soft lime #F1FAD7;
app background #F8F7FC; white #FFFFFF; main text #25251F;
secondary text #646459; card border #E5E2ED; input border #857E95.
Use dark text on lime and white text on deep-purple buttons.
Use Plus Jakarta Sans, 16px body, 13px readable metadata, 700-weight headings.
Radii: 14px inputs/buttons, 24px cards, 32px hero, 40px desktop landing shell.
Use 8px-based spacing, 48px inputs/buttons, and 44px minimum touch targets.
Outline icons must share one rounded style. Avoid heavy shadows and busy gradients.

LAYOUT
Desktop website reference width 1440px. Landing has a 32px purple outer margin,
white shell max 1376px and content max 1184px.
Desktop authenticated areas use a 240px sidebar.
Mobile reference width 390px, 20px horizontal content padding, vertical scrolling.
Do not shrink the entire desktop page into a phone. Do not add device mockup frames.
Content may extend below the reference viewport; keep a believable reading flow.

NAVIGATION
Students have exactly four primary items: Beranda, Tenang, Catat, Refleksi.
Use bottom navigation on mobile and a sidebar on desktop.
Rencana, Pustaka, Pengingat, Pengaturan are secondary destinations.
Counselors: Ringkasan, Permintaan bantuan, Umpan balik kelompok.
Admins: Akun, Undangan, Penugasan, Konten, Pengaturan sekolah.
Keep a labeled "Butuh bicara?" action discoverable on every screen, including
public/authentication screens. It must not cover forms, bottom navigation,
focused controls, or keyboard areas.

PRODUCT BOUNDARIES
Private journals and free-text reflections belong only in the student's area.
Counselor dashboards show weekly group aggregates with small-group suppression;
no student drill-down, journal excerpts, individual scores, risk lists, or AI analysis.
Voluntary help requests show the intended recipient, shared-data preview,
service hours, and delivery/status distinctions. No live chat or instant-response claim.
No diagnoses, invented screening scores, treatment claims, leaderboards,
streak pressure, rewards, purchases, or shopping elements.
Unapproved screening is visibly a simulation or unavailable.
Reminders are off by default and baseline reminders work inside the active app.

COPY AND DATA
Use "Awan-028", "Sekolah Contoh", "Bu Rani - Guru BK (contoh)" consistently.
Use a subtle "Mode contoh" label for private/staff prototype screens.
Do not invent real contact numbers or professional approvals.
Use supportive, concise copy and meaningful empty/error states.
No Lorem ipsum, English navigation, clinical-looking risk meters, or fake testimonials.

ACCESSIBILITY
Keep labels visible, selected states identifiable without color alone,
keyboard focus clear, body text readable, sufficient contrast, and text alternatives
for charts and audio. Calm and stopped exercise states must not look like failure.

Now create the specific screen(s) described in the appended batch brief.
Preserve this visual language and component proportions across all screens.
```

### 13.3 Batch 1 - Acuan visual publik dan siswa

**Target:** L01 desktop/mobile, S01 desktop/mobile. Ini empat frame yang menjadi acuan seluruh batch.

```text
Create the foundational TENANGIN.ID screens:

L01 desktop 1440px: an airy public landing page inside a large rounded white
canvas on a purple outer frame. Use a lime hero, headline "Pelan-pelan, kamu
boleh ambil jeda.", deep-purple CTA "Mulai dengan tenang", secondary
"Lihat cara kerjanya", and an original purple cloud illustration on the right.
Below: privacy note, four simple steps Kenali/Catat/Latih/Refleksi,
a lavender section with four white activity cards, a privacy section,
and a calm "Ingin bicara dengan seseorang?" support CTA. Include the full footer.
No prices, carts, medical claims, testimonials, or copied mascot.

L01 mobile 390px: stack the same content with a thin purple outer frame,
36px hero heading, readable buttons, and smaller illustration below the text.

S01 desktop: student sidebar, greeting "Halo, Awan-028.", compact lime banner
"Ada ruang untuk jeda.", a five-choice mood card, a short exercise card,
today's tasks, secondary shortcuts, weekly reflection, and one group message.

S01 mobile 390px: one-column prioritization, labeled help action in the header,
and exactly four bottom tabs Beranda/Tenang/Catat/Refleksi.
Do not turn the authenticated home into a long marketing landing page.
```

### 13.4 Batch 2 - Akses dan persetujuan

**Target:** A01, A02, A03, A04 mobile.

```text
Using the approved TENANGIN.ID visual system, create four mobile screens:

A01 login: code-account and password fields, visible labels, show-password control,
"Masuk", recovery link, activation link, and public help. No role privilege selector.

A02 activation: one-time activation token, account-code context, new password,
confirmation, activation action; include an expired-token variant.

A03 recovery: account-code form and neutral school-recovery instructions.
Do not reveal whether a particular account exists.

A04 data information and consent: three readable cards explaining stored data,
who can see it, and user controls; expandable details; no-emergency-monitoring
notice; version marked as example; unchecked consent checkbox; primary
"Setuju dan lanjut" and clearly visible "Belum ingin menyetujui".
Public library and help remain available after declining.
No prechecked consent or bundled notification permission.
```

### 13.5 Batch 3 - Mood dan skrining simulasi

**Target:** S02, S03, S04, S05 mobile.

```text
Create four consistent TENANGIN.ID mobile screens:

S02 mood: heading "Bagaimana perasaanmu hari ini?", five labeled radio cards
"Berat sekali", "Berat", "Biasa saja", "Cukup nyaman", "Nyaman".
Use outlined faces, purple selected border plus check, optional 0-10 subjective
pressure control explicitly separate from screening, "Simpan perasaan", "Lewati dulu".

S03 screening introduction: visible simulation badge, explain the real instrument
is not yet available; default state has no active real-screening start button.
Include a clearly separate "Lihat simulasi tampilan" action.

S04 simulation question: persistent "Contoh tata letak, bukan alat penilaian",
"Contoh 1 dari 3", a clearly generic example statement and four example choices
A/B/C/D. No invented psychological questionnaire or automatic selection.

S05 completion: "Simulasi selesai." and "Ini hanya contoh tampilan, bukan
penilaian kondisi dirimu.", with home/exercise actions and no score or risk meter.
```

### 13.6 Batch 4 - Latihan dan daftar jurnal

**Target:** S06, S07, S08, S09 mobile.

```text
Create these student mobile screens with the existing shell:

S06 exercises: "Pilih jeda yang cocok untukmu.", compact lime featured card,
three categories Latihan napas/Relaksasi otot/Mindfulness, durations 3-5 minutes,
short descriptions, voluntary participation note, consistent start actions.

S07 focused player: header back and help, exercise title, static lavender circle
or subtle optional breathing cue, large tabular timer, one text instruction,
progress, prominent pause/resume, always-visible stop, optional audio/text controls.
Include ready, running, and paused variants. Avoid inventing an unapproved protocol.

S08 ending: calm completion and early-stop variants. Use supportive copy,
home and optional journal actions, no failure state, points, medals, or confetti.

S09 journals: "Ruang catatmu", private list cards, "Tulis jurnal", date and
short owner-only excerpt, edit/delete actions; include a gentle empty state.
Never add a share-to-counselor or AI-analysis action.
```

### 13.7 Batch 5 - Menulis, merencanakan, merefleksikan

**Target:** S10, S11, S12, S13 mobile.

```text
Create four task-focused student screens:

S10 journal editor: "Ceritakan sedikit, sesuai nyamanmu.", privacy note,
four clearly labeled textareas for situation, thoughts, feelings, and optional
realistic alternative perspective. Show optional examples, character counters,
save/back actions, and a failed-save variant retaining the entered text.
Use white writing surfaces with minimal illustration.

S11 planner: "Satu langkah dulu.", date strip, today/next/unscheduled groups,
task checkboxes, small-step progress, separate Penting/Mendesak tags,
add-task action, and optional personal rest/sleep blocks. No punitive overdue copy.

S12 task editor: title, optional date/duration, separate importance/urgency
switches, editable small steps, save/cancel. Mobile full page, not a tiny modal.

S13 weekly reflection: week 16-22 November 2026; three textareas
"Apa yang membantumu?", "Apa hambatannya?", "Apa rencana kecilmu berikutnya?";
optional separate strategy tags, save, private history/edit/delete.
Do not force exercise completion before reflection.
```

### 13.8 Batch 6 - Materi, pengingat, dan kendali data

**Target:** S14, S15, S16, S17 mobile.

```text
Create four TENANGIN.ID student mobile screens:

S14 library: readable heading, topic/title search, six topic chips, article cards,
simple geometric art, concise titles and summaries. Content also has a public version.

S15 article: comfortable single-column reading, title, topic, example review/source
metadata clearly not a real approval, subheadings, text, support link and sources.

S16 reminders: main switch OFF by default; type, weekdays, time, school timezone,
quiet hours, save. Explain "Pengingat ini muncul saat aplikasi dibuka atau aktif."
Use generic notification preview, no sensitive data and no default phone-push claim.

S17 settings/privacy: account, preferences, consent version, data explanation,
withdraw consent, delete account, separate confirmations and reauthentication.
Use destructive red only for deletion. Do not invent an implemented export feature.
```

### 13.9 Batch 7 - Bantuan sukarela

**Target:** H01, H02, H03, H04 mobile.

```text
Create a complete voluntary-help flow in TENANGIN.ID:

H01 public help: supportive heading, school-counselor contact area, trusted-adult
guidance, clear non-emergency and non-continuous-monitoring note.
If contact is unconfigured, say so. Do not invent phone numbers or hotlines.

H02 form: select intended counselor, show example service hours,
optional message/topic and contact preference, explicit data-sharing explanation,
"Tinjau permintaan". Include counselor-unavailable variant.

H03 preview: show Awan-028, intended counselor, the exact optional message/contact,
and "Jurnal, refleksi, dan hasil skrining tidak ikut dikirim."
Actions "Kirim permintaan" and "Ubah dulu".

H04 receipt/status: distinguish stored from read, status chip and timeline,
one administrative counselor-response card, home/cancel actions.
No chat composer, chat bubbles, typing indicator, online badge, or instant-response promise.
```

### 13.10 Batch 8 - Ruang guru BK

**Target:** B01, B02, B03, B04 desktop.

```text
Create four desktop counselor screens at 1440px with the counselor sidebar:

B01 group overview: Sekolah Contoh, closed week 9-15 November 2026,
example counts 8 active / 6 reflections / 5 exercise participants;
screening score card says "Belum tersedia". Use lavender charts with text summaries,
clear example-data and aggregate-only labels, and a small-group suppressed state
"Data belum cukup untuk ditampilkan". No live arbitrary filters or individual drill-down.

B02 assigned voluntary-help queue: request code, pseudonym, submitted time,
status, open action. No clinical score, risk ranking, journal excerpt.

B03 request detail: only intentionally shared message/contact, status timeline,
one administrative response editor, acknowledge/follow-up/close actions.
No private journal access or counseling chat thread.

B04 one-way group feedback: drafts/published list, compose, preview the student
home card, publish only to assigned group, no comments or named student disclosures.
```

### 13.11 Batch 9 - Administrasi akses

**Target:** N01, N02, N03, A05 desktop.

```text
Create four consistent desktop administrative/access screens:

N01 school-account table: pseudonym code, role, activation state, account state,
administrative actions and invitation CTA. No mood, scores, journals, health ranking,
or impersonation action.

N02 invitation form/result: authorized role, account-code context, expiry context,
one-time example activation token clearly demo-only, and school-distribution guidance.
Never display a student's password.

N03 counselor assignments: counselor, permitted school/group scope, active period,
status, add/edit dialog. Explain the effect on permitted help requests and aggregates.

A05 staff MFA: one accessible code input displayed as six slots,
verify action, neutral error/recovery state, public help link.
Do not include a free role-switcher granting privileges.
```

### 13.12 Batch 10 - Konten, konfigurasi, dan komponen

**Target:** N04, N05, N06, V01 desktop.

```text
Create three admin screens and one separate design-system board:

N04 content list: Articles/Exercises tabs, title search, status filter,
title/type/version/review reference/date/status/action columns.

N05 content editor: title, topic/type, body, exercise duration if relevant,
optional audio, sources/usage rights, review reference, preview.
Show draft/review/approved/published lifecycle; no active publish for unapproved content.

N06 school settings: identity, configured timezone, service hours,
verified/unverified help contacts, consent-policy reference and guardian-policy context.
Do not show implementation secrets or invent verified real contacts.

V01 separate component board: tokens, typography, buttons, fields,
mood choices, navigation, cards, status chips, empty/error/offline states,
simulation notice, suppressed chart, unsaved-change and deletion dialogs.
Technical annotations and screen IDs belong only on this board, not in product UI.
```

### 13.13 Prompt penyelarasan hasil

Gunakan setelah ada hasil awal; isi placeholder instruksi dengan nama/ID layar acuan yang benar.

```text
Refine these TENANGIN.ID screens using the approved L01/S01 visual language.
Preserve each screen's information architecture and Indonesian copy.
Normalize purple/lime/lavender tokens, Plus Jakarta Sans typography,
14px controls, 24px cards, spacing, icon style, button heights, help placement,
and the exact four student navigation labels.
Keep marketing illustration expressive on the landing page and much quieter on forms.
Correct any white-on-lime text, tiny labels, excessive nested cards,
inconsistent sidebars, hidden secondary actions, or clipped controls.
Remove invented clinical scores, student rankings, chat composers,
private-journal access in staff screens, and unsupported service promises.
Show the resulting UI as complete website screens, without device mockups.
```

### 13.14 Prompt adaptasi responsive/state

```text
Adapt the approved TENANGIN.ID screen to the requested 390px mobile or 1440px desktop
layout while preserving its task, component language, Indonesian copy, and permissions.
Mobile students use four bottom tabs; desktop students use a 240px sidebar.
Staff mobile uses a menu drawer, not student tabs. Tables become labeled cards.
Keep touch targets at least 44px, body text 16px, labels readable, help visible,
and keyboard/fixed-CTA safe areas clear. Do not scale down the desktop screenshot.

Also create the requested state variant: empty, loading, failed save, offline,
session expired, screening unavailable, small-group data suppressed, or unsaved changes.
Use state-specific copy, preserve privacy, and do not claim successful saving or delivery
before the relevant confirmation.
```

## 14. Checklist review hasil UI

### 14.1 Identitas dan komposisi

- [ ] Ungu, lime, putih, lavender konsisten dengan referensi dan tokens.
- [ ] Landing memiliki headline kuat, hero lime, ilustrasi original, ruang lega.
- [ ] Form/jurnal tidak dipenuhi lime atau ilustrasi besar.
- [ ] Semua layar terlihat satu keluarga, dengan perbedaan kepadatan yang tepat.
- [ ] Logo, ikon, radius, border, tombol, dan tipografi konsisten.
- [ ] Tidak ada elemen belanja, logo/karakter referensi, testimoni/approval rekaan.

### 14.2 Layout dan navigasi

- [ ] Mobile adalah satu kolom yang disusun ulang, bukan desktop diperkecil.
- [ ] Empat menu siswa persis Beranda, Tenang, Catat, Refleksi.
- [ ] Menu sekunder dapat ditemukan tanpa tab kelima.
- [ ] Ruang siswa/guru/admin memiliki shell sesuai peran.
- [ ] Bantuan tersedia, terbaca, tidak menutupi konten atau keyboard.
- [ ] Konten, tooltip, dialog, dan CTA tidak terpotong pada 390 maupun 320 px.
- [ ] Tabel staf dapat dibaca dalam varian mobile.

### 14.3 Fitur dan batas produk

- [ ] F1 izin jelas, kosong secara default, menolak tetap memberi akses publik.
- [ ] F2 mood terpisah skrining; simulasi tanpa skor/diagnosis karangan.
- [ ] F3 jurnal empat bidang, alternatif opsional, simpan/edit/hapus/error.
- [ ] F4 latihan tiga jenis, jeda/lanjut/berhenti dan teks tanpa audio.
- [ ] F5 tugas, langkah kecil, penting/mendesak, istirahat, tanpa tanggal.
- [ ] F6 pengingat OFF default dan batas kanal eksplisit.
- [ ] F7 tiga pertanyaan refleksi, riwayat pribadi.
- [ ] F8 pustaka, pencarian, artikel dan status publikasi.
- [ ] F9 agregat aman, pesan kelompok satu arah, bantuan dengan preview/status.
- [ ] Guru/admin tidak memiliki akses jurnal atau skor individu.
- [ ] Tidak ada chat, AI jurnal, peringkat, streak, hukuman, janji darurat.

### 14.4 Keterbacaan dan prototype

- [ ] Teks/kontras/fokus/area sentuh diperiksa pada hasil aktual.
- [ ] Ikon, mood, dan status memiliki label, bukan warna saja.
- [ ] Setiap form memiliki kosong, validasi, simpan, gagal, dan retry yang masuk akal.
- [ ] Dataset/identitas/tanggal/angka konsisten dan jelas contoh.
- [ ] Semua layar kanonis memiliki tujuan, tindakan, dan jalan kembali.
- [ ] Data agregat disupresi pada seluruh representasi, bukan hanya satu angka.
- [ ] Semua prompt telah ditinjau terhadap PRD sebelum perakitan prototype.

## 15. Serah terima dan kontrol perubahan

Output desain yang diharapkan: layar acuan desktop/mobile, paket layar kanonis, komponen/state, alur transisi, dan hasil review. File hasil generate diberi nama dengan ID, misalnya `S01-beranda-mobile`, `B01-ringkasan-desktop`, `S10-jurnal-error-mobile`.

Bagian 13 dapat dipakai sebagai paket prompt tanpa menyalin seluruh detail backend PRD. Saat ada pertentangan, kebutuhan fitur/privasi mengikuti PRD; arahan visual mengikuti dokumen ini dan referensi pengguna terbaru.

Referensi pengguna disimpan sebagai salinan utuh; belum ada ilustrasi baru atau UI yang digenerate pada tahap penulisan dokumen ini. Jika referensi lain ditambahkan, catat unsur yang berubah dan dampaknya pada layar acuan sebelum memperluas ke seluruh set.

| Versi | Tanggal          | Perubahan                                                                                                   |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| 1.0   | 20 November 2026 | Adaptasi satu referensi ungu-lime; 38 layar/papan, tokens, responsive, alur, state, master prompt, 10 batch |
