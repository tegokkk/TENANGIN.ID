> ARSIP HISTORIS v1.0 — tidak berlaku sebagai acuan implementasi aktif. Gunakan dokumen bernama sama pada root proyek.

# PRD - TENANGIN.ID

**Product Requirements Document: Website Manajemen Stres Akademik dan Regulasi Emosi**

| Atribut            | Nilai                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| Versi              | 1.0                                                                                |
| Tanggal            | 20 November 2026                                                                   |
| Status             | Rancangan pembangunan; keputusan terbuka pada Bagian 23                            |
| Sumber utama       | `UTS PROPOSAL PENGEMBANGAN TEKNOLOGI BK (REVISI).pdf`, 35 halaman PDF              |
| Penyusun proposal  | Listiyani, Prodi Bimbingan dan Konseling Pendidikan Islam, UIN Raden Intan Lampung |
| Pengguna utama     | Siswa SMA/MA/sederajat kelas X-XI                                                  |
| Pengguna pendukung | Guru BK dan admin sekolah                                                          |
| Rilis pertama      | Prototipe F1-F9 dengan data tiruan, dilanjutkan pilot setelah prasyarat terpenuhi  |
| Bahasa produk      | Bahasa Indonesia                                                                   |

> PRD ini menerjemahkan proposal menjadi kebutuhan produk dan rancangan pembangunan. Isi proposal diperlakukan sebagai bahan analisis, bukan instruksi untuk menjalankan presentasi, merekrut siswa, menghubungi sekolah, atau melaksanakan penelitian. PRD ini tidak berarti website sudah dibangun atau efektivitasnya sudah terbukti.

## 1. Cara membaca dan keterlacakan sumber

Penanda asal kebutuhan:

- **[P] Proposal:** kebutuhan atau batasan eksplisit dalam proposal.
- **[R] Rekomendasi:** detail tambahan agar kebutuhan dapat dibangun dan diuji.
- **[A] Asumsi:** dasar perencanaan sementara yang dapat berubah.
- **[D] Keputusan terbuka:** perlu keputusan penanggung jawab sebelum fungsi terkait memakai data nyata.

Penanda pada judul berlaku untuk isi bagian kecuali dinyatakan lain. Seluruh target teknis, batas input, aturan agregasi, retensi, dan pilihan stack yang tidak disebut dalam proposal adalah rekomendasi, bukan temuan penelitian.

Referensi halaman menggunakan **nomor halaman PDF**, dengan nomor cetak dalam kurung bila diperlukan; sampul adalah halaman PDF 1.

| Sumber | Lokasi proposal                 | Dasar kebutuhan                                                |
| ------ | ------------------------------- | -------------------------------------------------------------- |
| S1     | Bab I, PDF 3-10                 | Masalah, kesenjangan layanan, tujuan, pembatasan sasaran       |
| S2     | Tabel 2, PDF 11 (cetak 9)       | Spesifikasi dan batas produk                                   |
| S3     | Bab II, Tabel 3-6, PDF 13-20    | Hubungan teori, fitur, dan indikator uji                       |
| S4     | Bagian 2.5, Tabel 7, PDF 20-21  | Etika, privasi, risiko, keputusan peringatan otomatis          |
| S5     | Bagian 3.1-3.3, PDF 22-23       | ADDIE, sasaran pilot, analisis kebutuhan                       |
| S6     | Tabel 9 dan navigasi, PDF 23-25 | Fitur F1-F9 dan empat menu utama                               |
| S7     | Gambar 2-3, Tabel 10, PDF 25-26 | Alur, wireframe, tata kelola data                              |
| S8     | Bagian 3.5-3.7, PDF 27-29       | Uji fungsi, uji pengguna, validasi, kategori kelayakan, jadwal |
| S9     | Bab IV, PDF 30-31               | Batas klaim dan kewenangan guru BK                             |
| S10    | Lampiran, PDF 34-35             | Draf persetujuan dan kisi-kisi angket                          |

## 2. Analisis proposal

### 2.1 Kesimpulan utama [P]

Tenangin.id adalah alat bantu layanan BK bidang pribadi dan belajar. Nilainya terletak pada siklus **mengenali kondisi diri -> mencatat pemicu dan pikiran -> berlatih menenangkan diri -> mengatur beban belajar -> merefleksikan -> mencari bantuan manusia bila diperlukan**.

Website perlu berupa aplikasi yang digunakan berulang, memiliki penyimpanan pribadi, akses sesuai peran, dan dasbor guru BK. Halaman pengenalan saja belum memenuhi tujuan proposal. Guru BK tetap menjadi fasilitator dan pengambil keputusan layanan. [S1-S3, S6-S9]

### 2.2 Masalah yang dijawab produk

| Masalah [P]                                          | Respons produk                                         | Batas interpretasi                                           |
| ---------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Latihan terbatas pada sesi terjadwal                 | Latihan singkat dan pencatatan mandiri melalui ponsel  | Penggunaan tidak membuktikan penurunan stres                 |
| Alat ketenangan umum belum selaras dengan BK sekolah | Bahasa siswa, privasi, jalur ke guru BK, batas layanan | Perbandingan proposal bersifat konseptual, belum audit pasar |
| Guru memerlukan gambaran kelompok                    | Ringkasan agregat dan umpan balik                      | Tidak menjadi jalan membaca catatan individu                 |
| Siswa mungkin enggan datang ke ruang BK              | Permintaan bantuan sukarela                            | Keengganan masih dugaan yang perlu analisis kebutuhan        |
| Kekhawatiran pelabelan dan kerahasiaan               | Data minimal, kode samaran, kontrol akses              | Pseudonim tidak otomatis membuat data anonim                 |

### 2.3 Kekuatan dan celah rancangan

**Kekuatan [P]:** sasaran serta F1-F9 jelas; teori terhubung dengan aktivitas; etika menjadi batas desain; evaluasi berfokus pada kelayakan, keterbacaan, keterterimaan, dan rasa aman data.

| Celah proposal                                 | Dampak                                     | Penyelesaian PRD                                                            |
| ---------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| Instrumen, skoring, interpretasi belum dipilih | Risiko skor tanpa dasar                    | [R] Instrumen berversi; [D] disahkan ahli sebelum data nyata                |
| Kode samaran belum menjelaskan autentikasi     | Kode terlihat dapat membuka akun           | [R] Pisahkan kode akun, token aktivasi, dan rahasia autentikasi             |
| Agregat dan tren refleksi belum operasional    | Kelompok kecil/teks dapat mengungkap siswa | [R] Snapshot mingguan, ambang minimum, tanpa teks bebas atau drill-down     |
| Kanal umpan balik belum jelas                  | Berubah menjadi chat konseling             | [R] Pesan kelompok satu arah dan respons administratif bantuan              |
| Bantuan belum memiliki status/prosedur         | Siswa tidak tahu apakah diterima           | [R] Status, jam layanan, petugas, dan pratinjau data                        |
| Retensi, penghapusan, pemulihan belum rinci    | Penyimpanan tanpa batas atau kebocoran     | [R] Jadwal retensi, backup, pencabutan sesi, job penghapusan                |
| Kanal pengingat belum ditetapkan               | Janji notifikasi tidak sesuai perangkat    | [R] Baseline dalam aplikasi; push fase lanjutan                             |
| Demo dan pilot belum dipisahkan tegas          | Data tiruan dan nyata bercampur            | [R] Lingkungan terpisah dan gerbang pilot                                   |
| Diagram tampak linier                          | Siswa dipaksa mengungkap perasaan          | [R] Persetujuan wajib untuk data pribadi; aktivitas sukarela dapat dilewati |

### 2.4 Batas bukti dan konsistensi

**[P]** Studi yang dikutip berasal dari konteks, usia, dan jumlah subjek berbeda. Angka sekolah lain tidak boleh dianggap sebagai prevalensi sekolah mitra. Produk belum dapat mengklaim efektivitas atau menjanjikan persentase penurunan stres. [S1, S3, S8-S9]

**[P]** Bagian 1.7 menyebut tiga bab, tetapi dokumen aktual memiliki Bab IV. Ini catatan penyuntingan, bukan perubahan kebutuhan website. Target tetap kelas X-XI sesuai spesifikasi/metode; studi kelas XII dalam kajian tidak otomatis memperluas target.

**[R]** PRD tidak memverifikasi independen seluruh jurnal/DOI. Ketepatan materi, hak penggunaan instrumen, dan kecocokan usia/bahasa tetap perlu pemeriksaan ahli.

## 3. Visi, tujuan, dan ukuran keberhasilan

### 3.1 Visi [P]

Ruang digital yang mudah dijangkau siswa untuk mengenali tekanan belajar, berlatih mengelola emosi secara sukarela, dan terhubung dengan guru BK melalui tata kelola data yang jelas.

### 3.2 Tujuan

| ID  | Tujuan [P]                           | Indikator operasional [R]                                       |
| --- | ------------------------------------ | --------------------------------------------------------------- |
| G1  | Latihan mandiri di luar jam BK       | Siswa dapat menjalankan latihan 3-5 menit dari ponsel           |
| G2  | Mengenali situasi, pikiran, perasaan | Jurnal/refleksi dapat disimpan, dibuka, diedit, dihapus pemilik |
| G3  | Mengatur beban belajar               | Tugas dipecah menjadi langkah dan tampil dalam rencana harian   |
| G4  | Gambaran kelompok untuk guru         | Agregat akurat tanpa membuka data individu                      |
| G5  | Bantuan sukarela                     | Permintaan tercatat sekali dan diterima hanya guru tujuan       |
| G6  | Prototipe layak diuji                | Seluruh kebutuhan kritis dan pengujian akses lulus              |

### 3.3 Target evaluasi rilis awal [R]

- 100% skenario kritis persetujuan, otorisasi, privasi, dan pengiriman bantuan lulus.
- F1-F9 tersedia di demo; fungsi yang menunggu keputusan ahli diberi label simulasi.
- Minimal 80% peserta menyelesaikan setiap tugas inti tanpa bantuan langsung; laporkan juga pembilang/penyebut, misalnya 8 dari 10.
- Target median cek mood <= 60 detik dan jurnal singkat <= 3 menit, untuk evaluasi UX.
- Target skor validasi/respons > 80% dari maksimum dan tanpa temuan kritis belum selesai. Ini target rilis, bukan bukti efektivitas.
- Penurunan stres, hari beruntun, dan kepatuhan individu tidak menjadi KPI MVP.

## 4. Pengguna dan hak akses

### 4.1 Persona kerja [A]

| Persona           | Konteks                                          | Kebutuhan                                                          |
| ----------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| Siswa kelas X-XI  | Ponsel, waktu singkat, mungkin perangkat bersama | Privasi, bahasa ramah, input sedikit, latihan singkat              |
| Guru BK           | Membagi waktu dengan layanan tatap muka          | Ringkasan kelompok dan antrean bantuan                             |
| Admin sekolah     | Mengelola akses dan konfigurasi                  | Aktivasi, penonaktifan, pemulihan, penugasan tanpa membaca catatan |
| Ahli materi/media | Menilai prototipe                                | Akun demo, skenario, kriteria, log revisi                          |

### 4.2 Matriks izin [P/R]

Peran berasal dari proposal; rincian penerapan berikut direkomendasikan. Satu akun terikat satu sekolah pada MVP.

| Data/aksi                     | Siswa                               | Guru BK                         | Admin sekolah                                               |
| ----------------------------- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Persetujuan                   | Memberi/menarik milik sendiri       | Informasi kebijakan             | Status/versi administratif                                  |
| Mood, skrining, hasil pribadi | Milik sendiri                       | Agregat yang memenuhi aturan    | Tidak dapat membaca                                         |
| Jurnal, tugas, refleksi bebas | Milik sendiri                       | Tidak dapat membaca             | Tidak dapat membaca                                         |
| Pengingat/preferensi          | Milik sendiri                       | Tidak dapat membaca             | Tidak dapat membaca                                         |
| Permintaan bantuan            | Membuat/melihat milik sendiri       | Hanya yang ditujukan/ditugaskan | Metadata penugasan bila diperlukan, tanpa isi               |
| Umpan balik kelompok          | Membaca kelompoknya                 | Membuat sesuai penugasan        | Tidak mengubah substansi BK                                 |
| Akun/peran                    | Mengubah rahasia sendiri            | Akun sendiri                    | Administrasi sekolahnya; tidak mengangkat diri menjadi guru |
| Konten                        | Membaca versi terbit                | Review materi sesuai penugasan  | Kelola draf/terbitkan versi disetujui                       |
| Statistik                     | Ringkasan pribadi                   | Agregat sesuai penugasan        | Operasional akun, tanpa ringkasan kesehatan                 |
| Audit                         | Keamanan akun sendiri bila tersedia | Tindakan bantuannya             | Log administratif tersanitasi                               |

**[R]** Tidak ada fitur menyamar sebagai siswa atau akses guru ke jurnal dalam MVP. Jika kelak berbagi catatan dibutuhkan, harus dibuat fitur persetujuan khusus yang terpisah. Pemulihan akun tidak memberikan admin kredensial yang dapat dipakai membuka isi lama; admin hanya memulai alur pemulihan terverifikasi.

**[R]** Tidak ada akun orang tua pada MVP. Jika izin wali diperlukan, sekolah memverifikasi lewat prosedur terpisah; sistem menyimpan status dan referensi minimal, bukan salinan identitas wali.

## 5. Cakupan dan prioritas rilis

**P0:** wajib untuk alur inti/perlindungan data. **P1:** penyempurnaan setelah inti teruji. **P2:** lanjutan setelah kebutuhan dan kapasitas terbukti.

| Area                      | Demo                      | MVP pilot                                                                  | Lanjutan                               |
| ------------------------- | ------------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| F1-F9                     | P0 dengan data tiruan     | P0 setelah keputusan terkait selesai                                       | Perbaikan dari evaluasi                |
| Akun dan pembatasan akses | Akun demo per peran       | P0 sesi nyata dan pengujian izin                                           | Integrasi identitas sekolah bila perlu |
| Skrining                  | Fixture berlabel simulasi | Instrumen disahkan; jika belum, nonaktif dan pilot belum mencakup F2 penuh | Instrumen tambahan setelah validasi    |
| Pengingat                 | Simulasi/dalam aplikasi   | P0 dalam aplikasi                                                          | P1 push opt-in, uji perangkat          |
| Konten/latihan            | Contoh draf/demo          | P0 materi ditinjau                                                         | P1 audio berlisensi                    |
| PWA                       | Website responsif         | P1 instalasi/cache publik                                                  | P2 offline luas setelah kajian privasi |
| Penghapusan/retensi       | Reset dataset             | P0 job penghapusan dan backup teruji                                       | Penyempurnaan operasi                  |
| Ekspor                    | Tidak wajib               | P1 ekspor pribadi terautentikasi ulang                                     | Agregat dengan supresi sama            |

**[A]** Pilot memakai satu sekolah mitra. Model memiliki `school_id` untuk batas akses, tetapi antarmuka administrasi banyak sekolah belum menjadi scope rilis pertama.

### 5.1 Di luar cakupan [P kecuali ditandai R]

- Diagnosis, label gangguan, terapi, dan janji kesembuhan.
- Chat konseling, keputusan tindak lanjut otomatis, layanan darurat, dan pemantauan 24 jam.
- Peringkat antarsiswa, hukuman tidak aktif, atau gamifikasi menekan.
- Akses catatan pribadi guru/admin tanpa persetujuan.
- **[R]** Pembayaran, marketplace konselor, forum sosial, unggahan bebas siswa, video call, integrasi nilai, dan dasbor wali.
- **[R]** Chatbot konselor, analisis sentimen/AI atas jurnal, dan pemanfaatan catatan untuk melatih model.
- **[R]** Pemindaian jurnal serta pengiriman peringatan otomatis ke guru/wali.

**[D]** Proposal meminta mekanisme peringatan dibahas bersama sekolah dan ahli, bukan diputuskan pengembang. Default PRD adalah tanpa pemindaian jurnal. Perubahan memerlukan keputusan desain terdokumentasi, evaluasi risiko, dan pembaruan informasi data.

## 6. Arsitektur informasi dan halaman

Empat menu utama siswa mengikuti proposal: **Beranda, Tenang, Catat, Refleksi**. Tombol **"Butuh bicara?"** tersedia di setiap layar, termasuk sebelum persetujuan. Fitur sekunder melalui pintasan dan menu akun. [S6-S7]

| Rute usulan [R]                       | Layar                 | Isi                                                                                   |
| ------------------------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `/`                                   | Pengenalan            | Tujuan, cara kerja, privasi ringkas, batas layanan, masuk, bantuan                    |
| `/masuk`, `/aktivasi`, `/pemulihan`   | Akses akun            | Kode akun, rahasia, token sekali pakai                                                |
| `/informasi-data`, `/persetujuan`     | Informasi/persetujuan | Data, tujuan, akses, retensi, hak, setuju/tolak                                       |
| `/app`                                | Beranda               | Sapaan samaran, mood, latihan, tugas, pengingat, umpan balik                          |
| `/app/cek-suasana-hati`               | Cek harian            | Pilihan mood berlabel dan tekanan subjektif opsional                                  |
| `/app/skrining`                       | Skrining              | Instruksi, instrumen aktif, progres, hasil/status belum tersedia                      |
| `/app/tenang`, `/app/tenang/[slug]`   | Latihan               | Daftar jenis/durasi dan player                                                        |
| `/app/catat`, `/app/catat/[id]`       | Jurnal                | Riwayat dan situasi-pikiran-perasaan-alternatif                                       |
| `/app/rencana`                        | Perencana             | Tugas, langkah kecil, prioritas, jadwal, istirahat                                    |
| `/app/refleksi`                       | Refleksi              | Tiga pertanyaan dan riwayat mingguan                                                  |
| `/app/pustaka`, `/app/pustaka/[slug]` | Pustaka               | Artikel terbit dan pencarian judul/tag                                                |
| `/pustaka`, `/pustaka/[slug]`         | Pustaka publik        | Materi terbit tanpa login/persetujuan; tampilan berbagi komponen dengan pustaka siswa |
| `/app/pengaturan`                     | Preferensi            | Pengingat, zona waktu, keamanan, tarik izin, hapus data                               |
| `/bantuan`                            | Bantuan publik        | Kontak terverifikasi, batas layanan, cara mencari bantuan                             |
| `/app/bantuan`, `/app/bantuan/[id]`   | Bantuan pribadi       | Penerima, jam layanan, pratinjau, kirim, status                                       |
| `/bk`                                 | Dasbor guru           | Snapshot mingguan, metrik, antrean                                                    |
| `/bk/permintaan/[id]`                 | Tindak lanjut         | Pesan sukarela, status, respons administratif                                         |
| `/bk/umpan-balik`                     | Pesan kelompok        | Buat/tinjau/terbitkan satu arah                                                       |
| `/admin`, `/admin/konten`             | Administrasi          | Akun, penugasan, konfigurasi, kontak, draf/review konten                              |

**[R] Struktur visual:** Beranda menonjolkan satu pertanyaan mood dan pintasan latihan; Tenang fokus pada satu instruksi; Catat memakai formulir bertahap dan status simpan; Refleksi menampilkan tiga pertanyaan; dasbor guru memberi definisi metrik serta ringkasan teks grafik. Admin tidak memiliki kolom jurnal/mood/skor pribadi.

## 7. Alur pengguna

### 7.1 Aktivasi dan penggunaan pertama [P/R]

1. Admin menyiapkan kode akun samaran dan token aktivasi. Distribusi mengikuti prosedur sekolah.
2. Siswa mengaktifkan akun, menetapkan rahasia, membaca informasi data. Kode publik berbeda dari token akses.
3. Jika izin wali disyaratkan, fungsi pribadi menunggu verifikasi yang sesuai.
4. Siswa setuju atau menolak. Penolakan tetap memberi akses pengenalan, materi publik, dan bantuan; tidak membuka penyimpanan pribadi.
5. Setelah setuju, aplikasi menawarkan mood dan skrining. **[R]** Aktivitas sukarela dapat dilewati; diagram linier diterapkan sebagai panduan.
6. Siswa masuk Beranda dan memilih aktivitas.

### 7.2 Siklus harian/mingguan [P/R]

Siswa dapat mengisi mood, menyusun rencana, menulis jurnal, berlatih, dan membaca pustaka secara mandiri. Pengingat mengikuti preferensi. Setiap minggu ditawarkan refleksi tentang hal yang membantu, hambatan, dan rencana. Guru membaca agregat yang aman dan memberi umpan balik kelompok. Permintaan bantuan dapat dikirim kapan saja; keputusan layanan tetap di guru BK.

### 7.3 Permintaan bantuan [R]

1. Tampilkan batas layanan dan jam petugas; jangan memberi kesan pemantauan darurat.
2. Siswa memilih guru, menulis topik/pesan opsional, dan cara dihubungi jika perlu.
3. Pratinjau menunjukkan data yang akan dibagikan: kode, tujuan, pesan, kontak sukarela. Jurnal/skor/refleksi tidak dilampirkan otomatis.
4. Siswa menekan kirim; server menyimpan permintaan dan event awal secara atomik.
5. "Terkirim" berarti tersimpan, bukan sudah dibaca. Guru tujuan meninjau antrean dan memperbarui status.
6. Respons dalam aplikasi bersifat administratif; konseling dilanjutkan melalui layanan sekolah.
7. Siswa melihat status dan dapat membatalkan sebelum selesai.

### 7.4 Penarikan persetujuan/penghapusan [R]

Siswa membaca perbedaan menarik izin, menghapus entri, dan menghapus akun. Penarikan menghentikan pengumpulan baru, partisipasi agregasi, serta pengingat; akses pribadi dibatasi ke privasi dan penghapusan. Hapus akun memerlukan autentikasi ulang, mencabut sesi/token, lalu menjalankan job pembersihan. Bantuan publik tetap tersedia.

## 8. Kebutuhan fungsional F1-F9

Fitur berasal dari proposal **[P]**; perilaku rinci dan acceptance criteria (AC) berikut adalah **[R]**. AC diuji pada server dan UI.

### F1 - Informasi dan persetujuan

**Tujuan [P]:** memahami tujuan, data, hak, dan batas layanan sebelum fungsi pribadi. [S4, S6, S10]

**Perilaku [R]:** ringkasan ramah siswa dan detail kebijakan; tidak dicentang otomatis; simpan versi, waktu, pengguna, cakupan, status. Izin notifikasi terpisah. Perubahan tujuan/akses data memerlukan persetujuan ulang.

- **F1-AC1:** akun tanpa izin aktif ditolak saat membuat mood, skrining, jurnal, tugas, refleksi melalui UI/API.
- **F1-AC2:** penolakan tidak dihukum dan bantuan publik tetap tersedia.
- **F1-AC3:** server menerima versi aktif saja; versi lama diarahkan membaca ulang.
- **F1-AC4:** penarikan langsung menghentikan pengumpulan berikutnya.
- **F1-AC5:** verifikasi wali diperiksa server jika kebijakan sekolah mensyaratkannya.

### F2 - Cek suasana hati dan skrining mandiri

**Tujuan [P]:** gambaran diri singkat dan hasil deskriptif; instrumen dipilih/divalidasi pada tahap desain. [S2, S6]

**Perilaku [R]:** mood menggunakan lima pilihan berlabel; tekanan subjektif 0-10 opsional, dinamai terpisah dari skor skrining. Satu mood per tanggal lokal zona waktu sekolah yang ditampilkan kepada siswa, dapat diperbarui. Skrining memakai instrumen, periode rujukan, jawaban, skoring, dan interpretasi yang disahkan ahli.

**[D]** Nama instrumen, lisensi, kecocokan usia/bahasa, frekuensi, item wajib, jawaban kosong, ambang pesan dukungan belum ditetapkan. Jangan membuat kategori rendah/sedang/tinggi sendiri.

- **F2-AC1:** mood tidak disebut diagnosis atau disetarakan dengan skor terstandar.
- **F2-AC2:** skoring memakai versi respons; versi baru tidak diam-diam menghitung ulang riwayat.
- **F2-AC3:** jawaban kosong tidak dianggap nol; ikuti instrumen atau tandai belum lengkap.
- **F2-AC4:** instrumen belum disahkan tidak menerima jawaban nyata; demo berlabel "Simulasi, bukan hasil penilaian".
- **F2-AC5:** hasil pribadi hanya untuk siswa; guru memakai agregat Bagian 13.
- **F2-AC6:** pesan dukungan mengikuti naskah/aturan disahkan; bantuan tersedia pada semua hasil.
- **F2-AC7:** skor tidak otomatis mengirim peringatan guru/wali.

### F3 - Jurnal pemicu dan pikiran

**Tujuan [P]:** situasi, pikiran, perasaan, dan penafsiran alternatif realistis. [S3, S6]

**Perilaku [R]:** CRUD milik sendiri; tiga isian inti, alternatif opsional; batas awal 2.000 karakter per teks. Contoh bersifat editorial, bukan keluaran AI atas jurnal. Tanpa lampiran siswa.

- **F3-AC1:** simpan/edit/hapus dan buka kembali konsisten setelah reload.
- **F3-AC2:** siswa lain, guru, admin ditolak meskipun mengetahui ID entri.
- **F3-AC3:** isi/kutipan/kata kunci tidak masuk dasbor, log, analitik, notifikasi.
- **F3-AC4:** contoh dapat dilewati dan tidak memaksa berpikir positif.
- **F3-AC5:** gagal simpan terlihat jelas; teks tetap di memori halaman, tidak diklaim tersimpan.
- **F3-AC6:** perubahan belum tersimpan memiliki pilihan simpan/buang saat keluar; tidak memakai cache publik/localStorage untuk draf pribadi.

### F4 - Latihan menenangkan diri

**Tujuan [P]:** napas, relaksasi otot, mindfulness sukarela 3-5 menit. [S2-S3, S6-S7]

**Perilaku [R]:** minimal satu panduan tiap kategori; teks tanpa audio; mulai/jeda/lanjut/selesai/berhenti. Naskah termasuk instruksi berhenti bila tidak nyaman ditinjau ahli. Pola napas/gerakan tidak ditetapkan pengembang sendiri; audio opsional tanpa autoplay.

- **F4-AC1:** timer menghitung waktu aktif dan jeda secara konsisten, termasuk perpindahan tab.
- **F4-AC2:** berhenti selalu tersedia dan tidak menghasilkan label gagal.
- **F4-AC3:** teks tetap dapat dipakai saat audio tidak ada/gagal.
- **F4-AC4:** reduced motion dihormati; instruksi tidak hanya lewat animasi.
- **F4-AC5:** sesi menyimpan jenis, versi, waktu, durasi aktif, status; tanpa kamera/mikrofon/sensor tubuh.

### F5 - Perencana beban dan prioritas

**Tujuan [P]:** memecah tugas, penting/mendesak, istirahat dan tidur. [S6]

**Perilaku [R]:** judul <= 120 karakter, target tanggal dan estimasi opsional, dua penanda prioritas, langkah kecil. Utamakan daftar harian/berikutnya; blok istirahat/tidur ditetapkan siswa, tanpa target kesehatan otomatis.

- **F5-AC1:** CRUD tugas/langkah tersimpan dan tampil pada hari tepat.
- **F5-AC2:** tugas tanpa tanggal tetap muncul sebagai belum dijadwalkan.
- **F5-AC3:** tugas lewat tanggal memakai bahasa netral dan dapat dijadwal ulang.
- **F5-AC4:** tugas selesai dapat dibuka lagi; hapus tugas membersihkan langkah.
- **F5-AC5:** isi tugas/jadwal individu tidak dapat dibaca guru/admin.

### F6 - Pengingat

**Tujuan [P]:** dapat diatur/dimatikan, teks tidak menyalahkan. [S2-S3, S6]

**Perilaku [R]:** default nonaktif; jenis, hari, waktu, jam tenang. Baseline MVP adalah pengingat saat aplikasi dibuka/aktif, dijelaskan tidak menjamin notifikasi saat ditutup. Push adalah P1: opt-in, service worker, subscription, dan pengiriman server mengikuti [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

- **F6-AC1:** nonaktif membatalkan kejadian tertunda; cek ulang sebelum push dikirim.
- **F6-AC2:** izin browser ditolak tidak menghalangi fungsi lain; status kanal akurat.
- **F6-AC3:** tanpa isi jurnal/skor/istilah sensitif di layar kunci; contoh "Ada waktu untuk jeda singkat?".
- **F6-AC4:** zona waktu/jam tenang dihormati; retry tidak mengirim ganda.
- **F6-AC5:** logout perangkat bersama melepas pertautan notifikasi akun pada perangkat itu.

### F7 - Refleksi mingguan

**Tujuan [P]:** apa yang membantu, hambatan, rencana perbaikan. [S3, S6-S7]

**Perilaku [R]:** satu refleksi per minggu lokal Senin-Minggu, edit/hapus, <= 2.000 karakter/jawaban. Jawaban bebas pribadi. Tag strategi terkurasi opsional dipilih terpisah untuk tren; tidak diekstrak dari teks.

- **F7-AC1:** simpan/buka/edit/hapus sesuai minggu.
- **F7-AC2:** minggu tanpa latihan tetap boleh direfleksikan.
- **F7-AC3:** tren guru hanya jumlah/tag yang aman, tanpa isi jawaban.
- **F7-AC4:** batas minggu mengikuti zona waktu sekolah yang ditampilkan jelas.

### F8 - Pustaka psikoedukasi

**Tujuan [P]:** panduan stres, tidur, dan cara meminta bantuan. [S2-S3, S6]

**Perilaku [R]:** topik dan pencarian judul/tag; sumber, peninjau, tanggal, versi; materi inti publik tanpa riwayat baca pribadi. Hak penggunaan teks/gambar/audio jelas.

- **F8-AC1:** minimal enam materi usulan pilot: stres, emosi, alternatif realistis, beban belajar, istirahat/tidur, bantuan.
- **F8-AC2:** hanya versi terbit tampil; draf tidak terbuka lewat URL tebakan.
- **F8-AC3:** pencarian kosong memiliki saran navigasi.
- **F8-AC4:** dapat dibaca tanpa audio/video.
- **F8-AC5:** perubahan substansi membuat versi baru dan perlu tinjau lagi.

### F9 - Dasbor guru BK dan jalur bantuan

**Tujuan [P]:** agregat pengguna aktif, rerata skor, tren refleksi, umpan balik, bantuan sukarela. [S6-S8]

**Perilaku [R]:** tiga fungsi terpisah: agregat, pengumuman kelompok satu arah, antrean bantuan. Satu respons administratif per permintaan, tanpa balas-membalas konseling.

- **F9-AC1:** API mengirim agregat diizinkan saja, bukan data individu yang disembunyikan UI.
- **F9-AC2:** rumus cocok fixture dan aturan Bagian 13.
- **F9-AC3:** klik/retry dengan idempotency key sama tidak membuat bantuan ganda.
- **F9-AC4:** hanya pemohon dan guru tujuan/penanggung jawab membaca isi; admin tidak.
- **F9-AC5:** status/waktu terlihat: terkirim, diterima, ditindaklanjuti, selesai, dibatalkan.
- **F9-AC6:** respons administratif dapat direvisi dengan riwayat, tanpa thread; konseling lewat layanan sekolah.
- **F9-AC7:** umpan balik kelompok tanpa kode siswa/kutipan pribadi.
- **F9-AC8:** tanpa guru aktif, jangan tampilkan klaim pengiriman tersedia; tampilkan kontak terverifikasi.
- **F9-AC9:** bantuan publik tetap terlihat saat sesi habis, API gagal, atau belum ada persetujuan.

## 9. Operasional pendukung [R]

### 9.1 Akun dan autentikasi

- Kode samaran bukan kredensial tunggal; gunakan kode + rahasia dan aktivasi sekali pakai berkedaluwarsa.
- Akun guru/admin melalui penugasan terverifikasi. Gunakan pustaka autentikasi terpelihara yang mendukung kredensial sekolah, sesi server, dan MFA.
- Cookie sesi `HttpOnly`, `Secure`, `SameSite` sesuai kebutuhan; logout mencabut sesi. Token tidak disimpan di localStorage.
- Batasi percobaan login/pemulihan; jangan membocorkan keberadaan akun. Autentikasi ulang untuk perubahan rahasia/hapus akun.
- MFA guru/admin wajib sebelum pilot nyata. Ini rekomendasi tambahan, bukan bunyi proposal.
- Pemulihan siswa memerlukan prosedur verifikasi; admin hanya memulai, bukan menerima kredensial untuk membuka data.
- Pisahkan autentikasi, sesi, dan otorisasi mengikuti [panduan Next.js](https://nextjs.org/docs/app/guides/authentication). Pustaka, versi, dan masa sesi diputuskan setelah kebutuhan/keamanannya diperiksa.

### 9.2 Konten dan konfigurasi sekolah

Alur konten: `draft -> in_review -> approved -> published -> archived`. Ahli/guru yang ditunjuk menilai substansi; admin menerbitkan versi disetujui. Review dapat dilakukan di luar aplikasi, dengan referensi persetujuan disimpan; akun ahli permanen tidak wajib.

Admin mengelola zona waktu IANA, jam layanan, kontak yang diizinkan dipublikasikan, kebijakan wali, versi kebijakan, dan penugasan. Kontak tidak ditebak pengembang dan harus diverifikasi pemilik layanan. Jangan tampilkan "tersedia sekarang" tanpa sumber status nyata.

## 10. UI/UX dan aksesibilitas [R]

### 10.1 Arah visual

Latar terang, aksen hijau kebiruan, teks gelap, ruang cukup, ilustrasi ringan. Palet kandidat: `#F7FAF9`, `#16332F`, `#0F766E`; uji semua kombinasi kontras. Font sans-serif, dasar sekitar 16 px, tinggi baris 1,5. Warna/ikon selalu memiliki padanan teks. Tombol bantuan tidak menutup konten, simpan, keyboard, atau fokus. Tema gelap/animasi dekoratif bukan prioritas MVP.

### 10.2 Bahasa

| Situasi             | Contoh                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| Mood                | "Bagaimana perasaanmu hari ini? Kamu boleh melewati ini."                      |
| Berhenti latihan    | "Latihan dihentikan. Kamu bisa kembali kapan pun."                             |
| Tugas lewat tanggal | "Ingin mengatur ulang rencananya?"                                             |
| Privasi             | "Jurnal ini bersifat pribadi. Guru BK tidak membacanya melalui aplikasi."      |
| Bantuan             | "Permintaan tersimpan. Guru BK meninjaunya sesuai jam layanan yang tercantum." |

Hindari label gangguan, kalimat menyalahkan, janji respons segera, keamanan mutlak, dan "100% anonim".

### 10.3 Standar dan keadaan layar

Target [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/): kontras teks normal >= 4,5:1 dan besar >= 3:1, keyboard, fokus terlihat/tidak tertutup, label semantik, error terhubung isian, heading terstruktur, pengumuman status simpan, dan padanan teks audio. Target internal area sentuh utama 44 x 44 CSS px untuk kenyamanan.

Uji reflow 320 CSS px, zoom teks 200%, potret/lanskap, pembaca layar, reduced motion. Grafik memiliki ringkasan/tabel aksesibel dengan supresi yang sama.

Setiap halaman data memiliki keadaan loading, kosong, sukses, gagal, tidak berizin, sesi habis. Formulir memiliki validasi, status simpan, retry aman. Bedakan "tidak ada data", "instrumen belum tersedia", dan "data belum cukup"; jangan semuanya diisi nol.

## 11. Arsitektur teknis usulan [R]

Proposal membolehkan prototipe desain/no-code dan belum menetapkan stack. Rancangan berikut ditujukan untuk aplikasi yang dapat dipelihara sesudah prototipe; boleh diganti tanpa mengubah kebutuhan, batas privasi, dan acceptance criteria.

| Lapisan        | Usulan                                                   | Alasan                                                 |
| -------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| UI dan server  | Next.js + TypeScript                                     | Satu basis kode untuk UI responsif dan endpoint server |
| Komponen/gaya  | CSS bertoken dan komponen aksesibel                      | Konsistensi tampilan, formulir, dialog                 |
| Database       | PostgreSQL                                               | Relasi, transaksi, integritas kepemilikan, agregasi    |
| Akses database | ORM/migration tool dipilih tim                           | Skema dan migrasi berversi/reviewable                  |
| Autentikasi    | Pustaka terpelihara, sesi server, kredensial sekolah/MFA | Menghindari algoritma autentikasi buatan sendiri       |
| Validasi       | Skema request/response; validasi otoritatif server       | Input dan field yang diizinkan eksplisit               |
| Media          | Aset publik materi terbit, unggah hanya pengelola        | Tidak menerima file pribadi siswa di MVP               |
| Job scheduler  | Worker agregasi, retensi, push opsional                  | Retry aman dan pemantauan tugas                        |
| Pengujian      | Unit, integrasi server, browser E2E                      | Verifikasi fungsi, data, izin, alur                    |
| Hosting        | Mendukung runtime, database privat, TLS, job, kunci      | Vendor sesuai tata kelola/kapasitas sekolah            |

Saat bootstrap pilih versi stabil masih didukung, periksa advisory, dan commit lockfile. PRD tidak mengunci nomor versi yang belum diuji. Domain `tenangin.id`, akun layanan, hosting, dan anggaran belum dianggap tersedia.

### 11.1 Batas komponen

```text
Browser siswa / guru BK / admin
        |
        v
UI responsif + session layer
        |
        v
API / server actions
  - autentikasi, status akun, persetujuan
  - izin per peran + sekolah + kepemilikan/penugasan
  - validasi, batas input, idempotensi
        |
        +--> layanan pribadi --> database terbatas
        +--> layanan bantuan --> permintaan + riwayat status
        +--> layanan konten ---> materi terbit + aset publik
        +--> agregasi ---------> snapshot mingguan tersupresi

Worker: agregasi, retensi, pengiriman push opsional
Observabilitas: metadata tersanitasi, tanpa isi pribadi
```

Semua akses data pribadi melewati server yang memeriksa sesi, status akun, izin aktif, sekolah, dan kepemilikan/penugasan. `user_id`, `role`, `school_id` tidak dipercaya dari klien. Dasbor hanya memakai endpoint agregat. Pemeriksaan menu/middleware saja tidak cukup: izin diperiksa setiap operasi, mengikuti [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

### 11.2 Struktur kode

```text
src/
  app/          # rute publik, siswa, guru, admin
  components/   # UI bersama dan aksesibel
  features/     # consent, mood, screening, journal, exercises, planner,
                # reminders, reflections, library, help, dashboard
  server/       # layanan bisnis, otorisasi, repository, skoring
  jobs/         # agregasi, retensi, pengiriman opsional
  lib/          # validasi, waktu, kriptografi, konfigurasi
db/             # skema, migrasi, seed demo
tests/          # unit, integrasi, E2E kritis
docs/           # keputusan teknis, panduan operasi, hasil uji
```

## 12. Model data [R]

Entitas sekolah memakai ID acak, `school_id`, waktu pembuatan/pembaruan, dan indeks sesuai akses. Foreign key mencegah relasi lintas sekolah. Teks pribadi serta jawaban skrining adalah data terbatas.

| Entitas                                        | Field/domain penting                                               | Aturan                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `schools`                                      | nama, zona waktu, jam, kebijakan wali, kontak terverifikasi        | Perubahan penting berversi                                       |
| `users`                                        | kode samaran, role, status, sekolah                                | Unik sekolah + kode; tanpa NISN/nama lengkap siswa pada baseline |
| `credentials`, `sessions`, `activation_tokens` | hash/metadata auth, kedaluwarsa, revoked_at                        | Dikelola pustaka; rahasia/token tidak disimpan polos             |
| `counselor_assignments`                        | guru, sekolah/kelompok, periode                                    | Dasar akses dan tujuan bantuan                                   |
| `consent_policies`                             | versi, cakupan, ringkasan, tanggal efektif                         | Versi terbit tidak diubah diam-diam                              |
| `consents`                                     | user, policy_version, accepted_at, withdrawn_at, status wali       | Status aktif diperiksa saat operasi pribadi                      |
| `mood_entries`                                 | user, local_date, mood, tekanan opsional                           | Unik user + tanggal; bukan skor instrumen                        |
| `screening_instruments`                        | nama, versi, item, skala, skor, interpretasi, approval_ref         | Hanya versi disahkan aktif untuk pilot                           |
| `screening_responses`                          | user, versi instrumen, jawaban terenkripsi, skor, waktu            | Server menghitung skor; incomplete terpisah                      |
| `journal_entries`                              | user, situasi, pikiran, perasaan, alternatif                       | Isi terenkripsi aplikasi; hanya pemilik                          |
| `exercise_contents`                            | kategori, versi, durasi, teks, audio, review                       | Tiga kategori inti dan riwayat versi                             |
| `exercise_sessions`                            | user, versi materi, waktu, active_seconds, status                  | started/paused/completed/stopped; tidak merekam setiap detik     |
| `tasks`, `task_steps`                          | user, judul, target, penting, mendesak, estimasi, urutan, status   | Langkah mengikuti kepemilikan tugas                              |
| `schedule_blocks`                              | user, istirahat/tidur, tanggal/waktu                               | Jadwal pribadi                                                   |
| `reminder_preferences`                         | user, jenis, hari, waktu, timezone, quiet_hours, enabled           | Nonaktif default                                                 |
| `notification_deliveries`                      | reminder, occurrence_key, status, sent_at                          | Unik per kejadian; tanpa isi pribadi                             |
| `push_subscriptions`                           | user, perangkat, endpoint, kunci, revoked_at                       | P1; rahasia dan dapat dicabut                                    |
| `weekly_reflections`                           | user, week_start, tiga jawaban, tag opsional                       | Unik user + minggu; tanpa ekstraksi teks                         |
| `articles`                                     | slug, versi, topik, isi, sumber, peninjau, tanggal, status         | Publik hanya versi terbit                                        |
| `help_requests`                                | pemohon, guru, pesan, kontak opsional, status, idempotency_key     | Tanpa lampiran jurnal/skor otomatis                              |
| `help_status_events`                           | request, aktor, transisi, waktu                                    | Riwayat status, bukan transkrip konseling                        |
| `help_acknowledgements`                        | request, guru, respons administratif berversi                      | Satu respons, tanpa thread                                       |
| `group_feedback`                               | guru, kelompok, periode, isi, status                               | Satu arah, tanpa data individu                                   |
| `aggregate_snapshots`                          | sekolah/kelompok, periode, metric, versi instrumen, nilai, supresi | Payload tanpa daftar kontributor                                 |
| `audit_events`                                 | aktor internal, aksi, objek, waktu, hasil                          | Tanpa teks pribadi/jawaban/token                                 |
| `deletion_requests`                            | user, cakupan, requested_at, status, completed_at                  | Job idempoten, bukti minimal                                     |

### 12.1 Relasi dan integritas

- Sekolah memiliki banyak akun; siswa memiliki catatan sendiri dan maksimal satu refleksi per minggu.
- Respons/sesi merujuk versi instrumen/materi yang benar, termasuk sesudah arsip.
- Bantuan memiliki satu pemohon, satu guru aktif, banyak event status. Simpan request + event awal dalam transaksi; demikian pula perubahan status.
- Unique constraint dan idempotency key mencegah duplikasi akibat retry/klik ganda.
- Waktu kejadian disimpan UTC; tanggal/minggu lokal dan zona waktu aturan tetap tercatat.
- Sekolah memilih zona waktu Indonesia yang sesuai; jangan mengasumsikan semuanya WIB. Mood harian mengikuti zona waktu sekolah yang ditampilkan, bukan pengaturan perangkat yang berubah.
- Perubahan zona waktu berlaku ke pencatatan baru, tidak menggeser riwayat diam-diam.
- Indeks utama: pemilik+tanggal, pemilik+minggu, guru+status+waktu, sekolah+periode+metric, versi instrumen, status+jadwal penghapusan.

### 12.2 Data yang tidak dikumpulkan

Baseline tidak meminta NISN, alamat rumah, tanggal lahir lengkap, nilai rapor, keluarga, biometrik, GPS, riwayat browser, kontak ponsel, atau rekaman audio/video siswa. Kontak tindak lanjut sukarela terlihat di pratinjau bantuan. Kode samaran adalah pseudonim, bukan bukti anonimitas.

## 13. Definisi agregasi dan dasbor [R]

### 13.1 Perlindungan kelompok kecil

- Default pilot: kelompok sekolah uji keseluruhan, tanpa filter kelas, gender, akun, tanggal bebas, atau kombinasi subkelompok.
- Periode minggu kalender tidak tumpang tindih; snapshot setelah minggu selesai, bukan live setiap siswa mengisi.
- **Ambang awal k = 5 siswa berbeda per metrik/periode.** Ini rekomendasi awal, bukan angka proposal atau jaminan anonim. Di bawah ambang, nilai/jumlah kontributor disupresi: "Data belum cukup untuk ditampilkan".
- Grafik, tooltip, tabel aksesibel, API, dan ekspor menerapkan aturan sama. Total/subtotal tidak boleh membuka nilai tersembunyi; terapkan supresi tambahan bila perlu.
- Tanpa drill-down individu, data mentah, kutipan refleksi, pencarian kata jurnal, atau daftar penyumbang metrik.
- **[D]** Sekolah/ahli menilai ulang ambang dan risiko pada pilot 8-10 siswa. Jika tetap mudah dikenali, hentikan metrik atau gunakan dataset demo untuk dasbor.

### 13.2 Kamus metrik

| Metrik            | Rumus                                                                    | Batas                                                                  |
| ----------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Aktif mingguan    | Siswa berbeda dengan >= 1 aktivitas inti tersimpan pada minggu itu       | Tanpa daftar akun, tunduk supresi                                      |
| Mood kelompok     | Rerata mood per siswa per minggu, lalu rerata antar siswa                | Ringkasan internal, bukan instrumen klinis                             |
| Rerata skrining   | Satu hasil lengkap terbaru/siswa/minggu untuk versi sama, lalu rata-rata | Hanya jika aturan instrumen mengizinkan; jangan campur versi/instrumen |
| Aktivitas latihan | Siswa berbeda dengan >= 1 latihan selesai pada minggu itu                | Bukan ukuran efektivitas/kepatuhan wajib                               |
| Refleksi mingguan | Siswa berbeda yang menyimpan refleksi                                    | Tanpa teks jawaban                                                     |
| Tren strategi     | Proporsi tag terkurasi yang dipilih siswa berbeda                        | Opsional; kategori/total tunduk supresi                                |
| Antrean bantuan   | Jumlah per status untuk guru penanggung jawab                            | Operasional terpisah; izin berdasarkan penugasan                       |

Aktivitas inti untuk metrik aktif: mood tersimpan, skrining lengkap, jurnal tersimpan, latihan selesai, perubahan rencana tersimpan, atau refleksi tersimpan. Membaca halaman/login saja tidak dihitung. Definisi dan versi rumus dicatat.

Nilai kosong tidak diganti nol. Tampilkan periode, definisi, waktu snapshot, batas interpretasi. Perubahan antar minggu tidak disebut dampak kausal website pada kesehatan mental.

### 13.3 Koreksi, penarikan, penghapusan

Hanya akun dengan persetujuan aktif dan catatan berlaku masuk perhitungan. Penarikan/penghapusan menginvalidasi snapshot terdampak; supresi sampai perhitungan ulang aman. Jangan memberikan riwayat agregat sebelum-sesudah yang membuka kontribusi individu. Uji risiko perbandingan hasil pada sampel kecil; agregasi bukan jaminan anonim.

## 14. Privasi, keamanan, dan siklus data [R]

### 14.1 Wajib sebelum pilot nyata

1. TLS, database berakses terbatas, akun database hak minimum.
2. Enkripsi penyimpanan/backup dan enkripsi aplikasi untuk teks jurnal, refleksi, bantuan, jawaban skrining. Kunci terpisah dari database/kode, memiliki versi, rotasi, prosedur pemulihan.
3. Jangan mengklaim end-to-end encryption: server menjalankan fungsi yang diizinkan. Operator infrastruktur tetap risiko; akses teknis darurat terbatas dan diaudit.
4. Validasi server, query terparameterisasi, sanitasi konten editorial, proteksi XSS/CSRF sesuai arsitektur, rate limit endpoint sensitif.
5. Default menolak; cek izin per operasi/objek; tes lintas pemilik, peran, sekolah, penugasan.
6. Respons sensitif `no-store`, tanpa cache CDN bersama/static generation/service worker untuk data pribadi; tidak menaruh isi data di URL.
7. Tanpa iklan, pelacak pihak ketiga/session replay di area pribadi. Error/log tidak berisi payload, rahasia, atau catatan.
8. Development/demo/pilot terpisah database, kunci, akun. Pengembang memakai data tiruan.
9. Backup terenkripsi, restore diuji, job gagal dipantau, penanggung jawab insiden jelas.
10. Secret di luar repo; review perubahan dependensi, skema, izin sebelum deployment.

### 14.2 Usulan retensi

Durasi ini usulan, **bukan kewajiban hukum atau ketentuan asli proposal**. Pengelola sekolah mengesahkan dan UI menyampaikan kebijakan yang benar sebelum data nyata.

| Kategori                                            | Usulan retensi                                                                 | Penghapusan                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Demo                                                | Reset sesuai kebutuhan                                                         | Tidak memakai salinan data nyata                                                                    |
| Data evaluasi                                       | Sesuai proposal: hapus sesudah evaluasi selesai                                | Usulan maksimal 30 hari setelah penutupan; hanya laporan yang diperiksa anonimitasnya dipertahankan |
| Mood, jurnal, tugas, sesi, refleksi, skrining pilot | Maksimal 90 hari bergulir atau akhir evaluasi, mana lebih cepat untuk data uji | Hapus entri oleh pemilik; akun diproses maksimal 7 hari                                             |
| Bantuan/respons administratif                       | Maksimal 90 hari setelah tutup, tunduk penghapusan data evaluasi               | Kebutuhan rekam layanan terpisah harus ditetapkan sekolah sebelum pilot                             |
| Log teknis tersanitasi                              | 30 hari                                                                        | Hapus pengenal tak diperlukan                                                                       |
| Audit/persetujuan minimal                           | Penutupan evaluasi + maksimal 90 hari                                          | Retensi setelah penarikan diputuskan pengelola, tanpa isi pribadi                                   |
| Token                                               | Singkat dan sekali pakai; durasi dipilih saat desain auth                      | Cabut saat dipakai, kedaluwarsa, atau akun nonaktif                                                 |
| Backup terenkripsi                                  | Rolling maksimal 30 hari                                                       | Salinan berakhir sesuai siklus; restore menerapkan daftar penghapusan sebelum akses dibuka          |

Penarikan izin segera menghentikan pengumpulan/agregasi/pengingat. Data yang masih tersimpan menunggu pilihan penghapusan atau batas retensi tidak boleh terus dipakai. Menghapus akun membersihkan relasi pribadi dan menginvalidasi agregat terkait; jangan menyimpan konten di log bukti penghapusan.

### 14.3 Tata kelola/insiden

Sekolah menetapkan pengelola data, kontak pengaduan, petugas pemulihan, dan prosedur pembatasan akses. Saat insiden: cabut sesi/kunci terdampak, hentikan endpoint berisiko, jaga bukti teknis tanpa menyebar isi pribadi, perbaiki, uji ulang, komunikasikan melalui penanggung jawab.

**[D]** Persyaratan hukum, persetujuan anak/wali, lokasi penyimpanan, vendor, kewajiban pemberitahuan, dan dasar retensi ditinjau pihak berwenang sebelum penggunaan nyata. PRD tidak menyatakan kepatuhan sudah terpenuhi.

## 15. Kontrak API dan aturan domain [R]

Kontrak logis ini dapat diterapkan melalui route handlers/server actions. Izin tetap berlaku meskipun implementasi/rute berubah.

| Metode/rute logis                                                        | Pemakai                      | Aturan                                          |
| ------------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------- |
| `POST /api/auth/activate`, `/login`, `/logout`, `/recover`               | Alur akun                    | Token, rate limit, sesi; tanpa enumerasi akun   |
| `GET /api/me`                                                            | Akun aktif                   | Identitas minimal, role, sekolah, status izin   |
| `GET /api/consent-policy`                                                | Publik                       | Kebijakan aktif                                 |
| `POST /api/consents`, `/api/consents/withdraw`                           | Pemilik                      | Idempoten, versi aktif                          |
| `GET/POST /api/moods`; `PATCH/DELETE /api/moods/:id`                     | Siswa                        | Pemilik, tanggal unik, batas nilai              |
| `GET /api/screening/active`; `POST /api/screening/responses`             | Siswa                        | Versi disahkan, skor server                     |
| `GET/DELETE /api/screening/responses/:id`                                | Pemilik                      | Riwayat versi; koreksi sesuai aturan instrumen  |
| `GET/POST /api/journals`; `GET/PATCH/DELETE /api/journals/:id`           | Siswa                        | Pemilik saja                                    |
| `GET /api/exercises`, `/api/exercises/:slug`                             | Publik/siswa                 | Hanya versi terbit                              |
| `POST /api/exercise-sessions`; `PATCH /api/exercise-sessions/:id`        | Siswa                        | Pemilik, transisi/durasi wajar                  |
| `GET/POST /api/tasks`; `PATCH/DELETE /api/tasks/:id`                     | Siswa                        | Pemilik; langkah mengikuti induk                |
| `GET/POST /api/schedule-blocks`; `PATCH/DELETE /api/schedule-blocks/:id` | Siswa                        | Pemilik, waktu valid                            |
| `GET/PUT /api/reminders`                                                 | Siswa                        | Hari, waktu, zona, kanal                        |
| `GET/POST /api/reflections`; `PATCH/DELETE /api/reflections/:id`         | Siswa                        | Unik minggu dan pemilik                         |
| `GET /api/articles`, `/api/articles/:slug`                               | Publik                       | Versi terbit, pencarian/pagination              |
| `GET/POST /api/help-requests`; `GET /api/help-requests/:id`              | Pemohon/guru tujuan          | Data minimal, idempotensi, izin objek           |
| `PATCH /api/help-requests/:id/status`                                    | Guru/pemilik sesuai transisi | Event atomik, alasan bila penugasan berubah     |
| `PUT /api/help-requests/:id/acknowledgement`                             | Guru tujuan                  | Satu respons administratif, riwayat revisi      |
| `GET /api/bk/dashboard`                                                  | Guru                         | Snapshot penugasan, supresi, tanpa filter bebas |
| `GET/POST /api/bk/feedback`                                              | Guru; siswa baca kelompoknya | Tanpa data individu                             |
| `/api/admin/users`, `/assignments`, `/settings`, `/content`              | Admin sesuai cakupan         | Tanpa isi pribadi; audit mutasi                 |
| `POST /api/me/deletion-request`                                          | Pemilik + autentikasi ulang  | Cabut sesi, job, bukti minimal                  |

### 15.1 Ketentuan request/response

- Allowlist field, tolak perubahan pemilik/peran/sekolah dari payload.
- Format error: `code`, pesan ramah, field errors bila ada, `request_id` nonrahasia.
- Bedakan belum masuk, tidak berizin/tidak ditemukan, izin diperlukan, instrumen nonaktif, konflik, input salah, rate limit, gangguan sementara.
- Resource milik orang lain menggunakan respons konsisten agar tidak membocorkan keberadaannya.
- Pagination awal 20, maksimum 100; filter kepemilikan di query server.
- Transaksi/idempotensi untuk mutasi penting; konflik dua tab memakai versi/`updated_at`, tidak menimpa jurnal/refleksi diam-diam.

### 15.2 State bantuan

```text
submitted -> acknowledged -> follow_up -> closed
    |              |             |
    +--------------+-------------+--> cancelled
```

Guru tujuan menjalankan diterima/tindak lanjut/selesai; pemilik membatalkan sebelum selesai. Kasus selesai tidak dibuka ulang; permintaan baru dibuat bila perlu. Penugasan ulang oleh petugas berwenang memiliki alasan dan pemberitahuan kepada siswa. Status tidak pernah berasal dari skor/analisis teks.

## 16. Performa, reliabilitas, koneksi terbatas [R]

| Aspek        | Target rencana                                                   | Verifikasi                             |
| ------------ | ---------------------------------------------------------------- | -------------------------------------- |
| Responsif    | Lebar 320, 360, 390, 768, 1280 CSS px                            | Browser dan perangkat pilot            |
| Muat awal    | LCP <= 2,5 detik pada profil mobile disepakati                   | Catat perangkat/jaringan uji           |
| Server       | p95 baca/tulis umum <= 1 detik pada beban rencana, di luar media | Uji lingkungan setara pilot            |
| Kapasitas    | [A] 100 akun dan 20 bersamaan sebagai kapasitas rencana          | Beban sintetis; pilot tetap 8-10 siswa |
| Ketersediaan | Target 99% bulanan selama pilot terkelola                        | Monitoring, bukan janji darurat        |
| Pemulihan    | RPO <= 24 jam, RTO <= 8 jam                                      | Uji backup/restore                     |
| Hemat data   | Teks utama, audio dimuat atas pilihan                            | Jaringan lambat/audio diblokir         |
| Integritas   | Sukses hanya setelah commit server                               | Putus jaringan, retry, klik ganda      |

MVP membutuhkan koneksi untuk menyimpan catatan. Status offline tidak boleh menyatakan sudah tersimpan. Jika PWA aktif, cache hanya shell/materi publik; jangan cache API pribadi. Antrean offline sensitif ditunda sampai enkripsi, pergantian akun, dan penghapusannya dirancang/diuji. Informasi bantuan memiliki fallback publik yang ringan.

## 17. Konten awal dan editorial

### 17.1 Paket pilot [R]

- Tujuan/batas layanan, informasi data, persetujuan versi, bantuan sekolah terverifikasi.
- Tiga latihan teks 3-5 menit, satu per kategori. Label "Napas 4-6" pada wireframe diperlakukan contoh, bukan protokol sudah disahkan.
- Enam artikel sesuai F8 dengan tujuan, penjelasan sederhana, langkah relevan, bantuan, sumber.
- Contoh pikiran alternatif realistis, tanpa menyalahkan.
- Tiga pertanyaan refleksi dan tag strategi opsional.
- Microcopy lengkap untuk kosong, error, hasil, pengingat, konfirmasi, status bantuan.

### 17.2 Review [P/R]

Ahli materi memeriksa teori, usia/bahasa, sifat sukarela, klaim, instruksi berhenti, bantuan, interpretasi skrining. Ahli media memeriksa navigasi, keterbacaan, konsistensi, keamanan dasar. Dua putaran sesuai proposal: sebelum uji pengguna dan sesudah revisi. Semua saran memiliki keputusan/alasan pada log. [S8]

## 18. Analitik dan evaluasi tanpa membaca catatan [R]

Gunakan agregat aplikasi dan observasi uji; pelacak eksternal bukan kebutuhan MVP. Jangan mengirim teks formulir, nilai mood/skor individu, judul tugas, atau pesan bantuan ke analitik.

| Peristiwa minimal         | Atribut diizinkan                 | Tujuan                         |
| ------------------------- | --------------------------------- | ------------------------------ |
| `consent_flow_completed`  | versi, hasil alur                 | Hambatan persetujuan           |
| `mood_save_result`        | sukses/gagal, kelompok durasi     | Hambatan simpan tanpa mood     |
| `journal_save_result`     | sukses/gagal, kelompok durasi     | UX tanpa isi                   |
| `exercise_session_result` | kategori, status, kelompok durasi | Fungsi player, bukan kepatuhan |
| `reflection_save_result`  | sukses/gagal                      | Alur mingguan                  |
| `help_submission_result`  | sukses/gagal, kode error teknis   | Jalur bantuan                  |
| `authorization_denied`    | jenis resource, role, hasil       | Keamanan tanpa payload         |

Hindari identitas langsung/gabungan lintas layanan. Korelasi teknis memakai pengenal berumur terbatas bila perlu dan akses terbatas. Data berkode tetap diperlakukan dapat terkait pengguna, bukan otomatis anonim. Peristiwa analitik opsional harus masuk penjelasan data dan dinonaktifkan jika belum diperlukan.

## 19. Pengujian dan kriteria penerimaan rilis

### 19.1 Keterlacakan uji proposal [P/R]

| Uji proposal | Fitur   | Pemeriksaan implementasi [R]                                          |
| ------------ | ------- | --------------------------------------------------------------------- |
| U1           | F1      | UI/API menolak simpan tanpa izin; bantuan publik tetap ada            |
| U2           | F2      | Skor fixture sesuai versi, deskriptif, tanpa instrumen palsu di pilot |
| U3           | F3      | Simpan/edit/hapus/buka ulang, penolakan lintas pemilik/peran          |
| U4           | F4      | Mulai, jeda, lanjut, selesai, berhenti, durasi dan fallback teks      |
| U5           | F5      | Tugas/langkah/jadwal tersimpan dan hari benar                         |
| U6           | F6      | Opt-in/nonaktif, zona waktu, jam tenang, izin ditolak, deduplikasi    |
| U7           | F7      | Minggu benar, riwayat, edit, tanpa teks di dasbor                     |
| U8           | F9      | Rumus, ambang, kategori tersupresi, tanpa data mentah                 |
| U9           | F9      | Tombol, pratinjau, idempotensi, guru tujuan, status                   |
| U10          | Semua   | Peran, sekolah, pemilik, penugasan pada setiap operasi                |
| T11 tambahan | F8      | Pencarian, versi terbit, draf tertutup, sumber/reviewer               |
| T12 tambahan | Privasi | Tarik izin, hapus, cache, log, backup, restore                        |

### 19.2 Tingkat pengujian [R]

- **Unit:** skoring fixture, aturan instrumen, tanggal lokal/minggu, waktu aktif latihan, supresi, state bantuan, retensi.
- **Integrasi:** autentikasi/izin, query pemilik, batas sekolah, transaksi, idempotensi, penghapusan relasi, invalidasi snapshot.
- **E2E:** siswa dari aktivasi sampai refleksi; guru dari antrean sampai respons; admin dari akun sampai penugasan.
- **Uji negatif:** ID milik orang lain, role/sekolah palsu, guru bukan tujuan, draf via URL, payload berlebih, tanpa consent, sesi dicabut.
- **Privasi:** inspeksi API dasbor, log/error, tooltip/tabel, cache, pergantian akun perangkat bersama.
- **Koneksi:** offline, gagal simpan, klik ganda, retry, dua tab konflik, audio gagal.
- **Aksesibilitas:** keyboard, pembaca layar, kontras, zoom, reduced motion, fokus tidak tertutup.
- **Operasional:** migrasi database kosong, seed demo, backup/restore, job gagal, rollback.

### 19.3 Uji terbatas dan validasi [P]

- 8-10 siswa kelas X-XI, 1-2 guru BK, satu ahli materi BK, satu ahli media/TI. Pemilihan mitra/subjek dilakukan sesuai proposal dan belum dianggap terlaksana.
- Keikutsertaan sukarela; siswa yang diketahui guru sedang dalam penanganan khusus tidak dibebani sebagai subjek uji.
- Tugas siswa: persetujuan/mood, satu jurnal, satu latihan, refleksi mingguan.
- Tugas guru: membaca dasbor, menerima bantuan simulasi, memberi umpan balik.
- Catat waktu, kesalahan, komentar; siswa dapat berhenti, guru mendampingi.
- Skala respons 1-4; persentase = total skor / skor maksimum jawaban valid x 100%.
- Kategori proposal: 81-100% sangat layak; 61-80% layak; 41-60% cukup; <= 40% kurang. Untuk nilai pecahan, gunakan batas kontinu >80, >60, >40, <=40 dan laporkan nilai asli; ini aturan pelaporan [R].
- Analisis deskriptif, tanpa generalisasi atau klaim efektivitas penurunan stres. [S5, S8, S10]

**[R]** Demonstrasi fungsi memakai data tiruan. Jika pilot hanya menilai usability, arahkan siswa memasukkan skenario fiktif, bukan mengungkap pengalaman sensitif. Pengumpulan pengalaman nyata, bila diperlukan, harus tercantum dalam tujuan/informasi/izin pilot tersendiri dan seluruh gerbang data nyata terpenuhi.

### 19.4 Definition of Done [R]

- Semua F1-F9 dapat ditelusuri ke AC dan hasil uji; fungsi ditunda/nonaktif dinyatakan terbuka.
- Seluruh uji kritis lulus, tanpa temuan kebocoran, izin salah, data hilang, bantuan salah tujuan.
- Formulir/layar memiliki validasi, kosong, loading, error, retry, sesi habis, status simpan.
- Materi terbit punya persetujuan reviewer, sumber, hak pakai, versi.
- Role/milik/sekolah diuji melalui API, bukan sekadar menu.
- Seed sepenuhnya tiruan; tidak ada secret/data pribadi di repo/log/demo.
- Instrumen nyata disahkan sebelum F2 penuh dipilotkan.
- Migrasi, backup/restore, penghapusan, rollback, serta panduan admin/guru tersedia.
- Hasil uji dan keterbatasan dicatat. Tidak menyebut produk efektif hanya karena fungsi lulus.

## 20. Roadmap dan backlog

### 20.1 Roadmap mengikuti ADDIE [P/R]

Jadwal delapan minggu mengikuti struktur proposal, bukan janji tanggal tetap. Tanggal mulai ditetapkan setelah mitra/tim tersedia. Cakupan aplikasi nyata dapat memerlukan iterasi tambahan; satu minggu prototipe hanya untuk demonstrasi inti, bukan jaminan aplikasi produksi lengkap.

| Minggu     | Tahap                 | Pekerjaan                                             | Luaran/gerbang                        |
| ---------- | --------------------- | ----------------------------------------------------- | ------------------------------------- |
| 1          | Analisis awal         | Review proposal/PRD dan perbaikan prioritas           | Tujuan, batas, penanggung jawab       |
| 2          | Persiapan             | Instrumen kebutuhan, koordinasi, izin, keputusan data | Instrumen dan kebijakan awal          |
| 3          | Analisis              | Angket/wawancara, ponsel/jaringan, layanan, privasi   | Temuan yang merevisi kebutuhan        |
| 4          | Desain                | Wireframe, konten, skrining, data, akses, bantuan     | Desain ditinjau, keputusan kritis     |
| 5          | Pengembangan demo     | Alur F1-F9, role demo, dataset tiruan                 | Prototipe fungsi inti                 |
| 6          | Validasi/revisi       | Ahli materi/media, uji teknis, perbaikan              | Log revisi dan keputusan pilot        |
| 7          | Implementasi terbatas | Skenario siswa/guru dan observasi                     | Catatan dan angket                    |
| 8          | Evaluasi              | Analisis deskriptif, revisi, validasi ulang           | Prototipe revisi, laporan, backlog    |
| Sesudahnya | Pematangan            | Operasi data nyata, hardening, push/PWA bila perlu    | Rilis hanya sesudah gerbang terpenuhi |

### 20.2 Urutan implementasi [R]

| Epic                    | Scope                                                 | Dependensi                                 |
| ----------------------- | ----------------------------------------------------- | ------------------------------------------ |
| E0 Fondasi              | Struktur, skema, lingkungan, token visual, akun demo  | Tidak ada                                  |
| E1 Akses/izin           | Auth, role, sekolah, penugasan, F1, informasi bantuan | E0                                         |
| E2 Aktivitas pribadi    | F2 mood, F3, F5, F7                                   | E1                                         |
| E3 Konten/latihan       | Review, F4, F8                                        | E0; sesi personal setelah E1               |
| E4 Pengingat            | F6 dalam aplikasi                                     | E1, preferensi, aturan waktu               |
| E5 Bantuan              | F9 pratinjau, pengiriman, status, respons             | E1, guru aktif, prosedur                   |
| E6 Agregat              | Snapshot, supresi, dasbor, pesan kelompok             | E2, E3, definisi disepakati                |
| E7 Skrining tervalidasi | Instrumen berversi, skoring, hasil                    | E1 + keputusan ahli                        |
| E8 Kelayakan pilot      | Keamanan, hapus, backup, aksesibilitas, E2E           | Epic terkait siap; tanpa temuan kritis     |
| E9 Lanjutan             | Push, instalasi PWA, ekspor                           | Hasil evaluasi dan kebutuhan terkonfirmasi |

### 20.3 Peran tim dan biaya [R]

Pemilik produk/penyusun menjaga kesesuaian proposal; guru BK memvalidasi alur/konten dan tindak lanjut; ahli materi menilai substansi; ahli media menilai UX; pengembang membangun/menguji; admin menjaga akses/konfigurasi. Satu orang dapat memegang beberapa peran operasional, tetapi review substansi dan pemeriksaan kritis tetap perlu pihak yang kompeten.

Anggaran belum dihitung karena vendor, domain, media, volume, dan durasi belum dipilih. Siapkan biaya domain/hosting, database/backup, penyimpanan/traffic, pengembangan/pengujian, review ahli, pemeliharaan, serta kanal notifikasi opsional. Jangan mengasumsikan paket gratis mencukupi untuk data siswa nyata.

## 21. Risiko dan mitigasi

| Risiko                           | Dampak                           | Mitigasi                                                               | Penanggung jawab     |
| -------------------------------- | -------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| Instrumen belum disahkan         | Hasil menyesatkan                | Simulasi berlabel; nonaktif pada nyata                                 | Ahli materi, pemilik |
| Salah izin objek/peran           | Kebocoran catatan                | Deny default, cek server, tes lintas akses                             | Pengembang           |
| Agregat kelompok kecil           | Identifikasi siswa               | Snapshot tetap, supresi, batasi filter, review                         | Pengembang, sekolah  |
| Kode dijadikan sandi tunggal     | Pengambilalihan akun             | Rahasia terpisah, token, rate limit, pemulihan                         | Pengembang/admin     |
| Bantuan dianggap layanan segera  | Harapan tidak sesuai             | Jam/batas jelas, status, prosedur petugas                              | Guru/sekolah         |
| Data uji nyata bercampur demo    | Paparan informasi                | DB/kunci/akun terpisah, skenario fiktif                                | Pengembang           |
| Jurnal serius tidak terdeteksi   | Siswa mengira dipantau           | Informasi jurnal tidak dipantau, bantuan terlihat, tanpa janji deteksi | Guru/sekolah, ahli   |
| Latihan tidak nyaman             | Pengalaman negatif               | Sukarela, berhenti, teks ditinjau, alternatif bantuan                  | Ahli materi          |
| Pengingat gagal browser          | Kebingungan                      | Baseline jelas, push opsional dan fallback                             | Pengembang           |
| Jaringan putus                   | Data tidak tersimpan             | Konfirmasi commit, retry aman, status jelas                            | Pengembang           |
| Perangkat bersama                | Siswa lain membuka akun          | Logout, sesi, cache aman, lepas notifikasi                             | Pengembang/admin     |
| Jadwal terlalu sempit            | Mengorbankan fungsi/keamanan     | Demo tiruan dulu, tunda fitur lanjutan                                 | Pemilik produk       |
| Temuan studi digeneralisasi      | Klaim tidak sah                  | Bahasa terbatas, laporkan konteks dan sampel                           | Pemilik/ahli         |
| Tidak ada kapasitas pemeliharaan | Job/kontak/keamanan terbengkalai | Tunjuk operator dan prosedur sebelum pilot                             | Sekolah              |

## 22. Gerbang rilis [R]

### 22.1 Demo akademik

F1-F9 dapat dicoba dengan dataset tiruan dan peran terpisah. Skrining belum disahkan selalu berlabel simulasi. Bantuan simulasi tidak mengirim ke pihak luar atau memberi kesan terpantau sungguhan. Tersedia naskah demo, akun, keterbatasan, hasil uji awal, dan log revisi.

### 22.2 Pilot dengan data nyata

- Mitra, petugas BK, jam layanan, dan prosedur bantuan ditetapkan.
- Izin siswa/wali sesuai kebijakan dan ketentuan yang telah ditinjau.
- Konten, informasi data, retensi, dan prosedur pengaduan ditetapkan.
- Instrumen disahkan untuk F2 penuh; bila belum, pilot parsial menyatakan keterbatasannya.
- Role, pemilik, penugasan, sekolah, MFA staf, supresi, dan penarikan/penghapusan lulus uji.
- Lingkungan aman, kunci terpisah, backup/restore, log tersanitasi, monitoring siap.
- Tidak ada temuan kritis terbuka; pendamping dan penanggung jawab evaluasi tersedia.

### 22.3 Operasi sesudah pilot

Hasil pilot dianalisis, revisi kritis selesai, kapasitas layanan/pemeliharaan tersedia, hosting/domain diputuskan, prosedur insiden/pembaruan berjalan. Klaim tetap sesuai bukti kelayakan sampai ada penelitian efektivitas yang memadai.

## 23. Asumsi dan keputusan terbuka

Bagian ini tidak menghalangi pembangunan demo tiruan. Keputusan diperlukan sebelum fungsi terkait diaktifkan dengan data nyata.

| ID  | Keputusan                            | Default perencanaan                         | Pemilik                 | Batas waktu                 |
| --- | ------------------------------------ | ------------------------------------------- | ----------------------- | --------------------------- |
| D1  | Sekolah, kalender, zona waktu        | Satu sekolah; zona dikonfigurasi            | Pemilik/sekolah         | Sebelum pilot               |
| D2  | Instrumen, lisensi, versi, skoring   | Demo fixture; nyata nonaktif                | Ahli BK/pemilik         | Sebelum skrining nyata      |
| D3  | Isi hasil/pesan dukungan             | Tanpa label/ambang karangan                 | Ahli BK                 | Sebelum F2 nyata            |
| D4  | Wali, verifikasi, informasi data     | Mekanisme berversi, sukarela                | Sekolah/pihak berwenang | Sebelum rekrut/pengumpulan  |
| D5  | Privasi agregat                      | Minggu tetap, k=5, tanpa subfilter          | Sekolah/ahli/pengembang | Sebelum agregat nyata       |
| D6  | Tren refleksi                        | Jumlah/tag, bukan isi bebas                 | Guru/ahli               | Sebelum dasbor              |
| D7  | Guru tujuan, jam, target respons     | Tampil jam yang benar, tanpa janji instan   | Sekolah/guru            | Sebelum bantuan nyata       |
| D8  | Kanal pengingat                      | Dalam aplikasi, nonaktif default            | Pemilik/pengembang      | Desain F6                   |
| D9  | Autentikasi/pemulihan                | Kode + rahasia, sesi server, MFA staf       | Pengembang/sekolah      | Sebelum akun nyata          |
| D10 | Retensi/hapus/rekam layanan          | Usulan Bagian 14, bukan durasi sah otomatis | Pengelola data          | Sebelum data nyata          |
| D11 | Vendor, lokasi, kunci, biaya, domain | Vendor belum dipilih                        | Sekolah/pemilik         | Sebelum deployment nyata    |
| D12 | Peringatan otomatis                  | Tidak pindai/kirim dari jurnal/skor         | Sekolah/guru/ahli       | Sebelum perubahan kebijakan |
| D13 | Konten, pola latihan, hak media      | Draf sampai review                          | Ahli/admin/pemilik      | Sebelum terbit              |
| D14 | Kelanjutan operasi                   | Tidak diasumsikan ada SLA/anggaran          | Sekolah/pemilik         | Sebelum pascapilot          |

**Asumsi:** kelas X-XI, Bahasa Indonesia, ponsel/koneksi tersedia untuk pilot, akun dikelola sekolah, tanpa pembayaran, tanpa AI atas catatan, tanpa banyak sekolah pada UI awal. Temuan analisis kebutuhan dapat mengubah asumsi melalui revisi PRD.

## 24. Paket serah terima [R]

Pembangunan dianggap siap ditinjau bila menghasilkan:

1. Wireframe final empat layar siswa, bantuan, guru, admin, termasuk seluruh state.
2. Token/komponen visual dan paket konten ditinjau.
3. Kode, lockfile, panduan setup, skema/migrasi, seed tiruan, contoh konfigurasi tanpa secret.
4. Matriks izin, kontrak server, instrumen/skoring berversi bila disahkan.
5. Hasil uji fungsi/akses/privasi/aksesibilitas, observasi pilot, log revisi.
6. Panduan siswa/guru/admin, jam/prosedur layanan, kebijakan data, retensi, hapus.
7. Runbook deployment, backup/restore, rollback, job, monitoring, kontak operator.
8. Daftar keterbatasan, keputusan terbuka, dan backlog lanjutan.

## 25. Referensi dan kontrol perubahan

### 25.1 Referensi

- **Proposal utama:** `UTS PROPOSAL PENGEMBANGAN TEKNOLOGI BK (REVISI).pdf` di folder yang sama. Rujukan detail melalui S1-S10; Gambar 1-3 diperiksa secara visual.
- **Autentikasi:** [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication), diakses 20 November 2026.
- **Otorisasi:** [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), diakses 20 November 2026.
- **Push:** [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), diakses 20 November 2026.
- **Aksesibilitas:** [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), diakses 20 November 2026.

Sumber teknis mendukung rekomendasi implementasi; tidak memvalidasi manfaat klinis produk, memberi izin penelitian, atau menggantikan keputusan sekolah/ahli.

### 25.2 Perubahan dokumen

Perubahan tujuan, sasaran, akses pribadi, instrumen, interpretasi, agregasi, bantuan, retensi, dan pihak penerima data harus dicatat bersama alasan, penanggung jawab, serta dampak desain/uji. Kebutuhan proposal yang ditunda tetap ditandai, tidak dihapus diam-diam.

| Versi | Tanggal          | Perubahan                                                                                 |
| ----- | ---------------- | ----------------------------------------------------------------------------------------- |
| 1.0   | 20 November 2026 | Analisis 35 halaman, F1-F9, rancangan website, data/API, privasi, uji, roadmap, keputusan |
