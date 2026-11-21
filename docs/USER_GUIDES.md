# Panduan Pengguna TENANGIN.ID

## 1. Panduan Siswa (`student`)

1. **Masuk & Persetujuan:** Masuk di `/masuk` menggunakan kode samaran (misal `Awan-028`) dan kata sandimu. Jika baru pertama kali masuk atau kebijakan diperbarui, baca ringkasan akses data (termasuk akses pemilik & Superadmin serta pemantauan metadata oleh BK) lalu pilih **Setuju** atau **Tolak**. Penolakan tetap memberimu akses ke Pustaka Publik (`/pustaka`) dan Informasi Bantuan (`/bantuan`).
2. **Beranda (`/app`):**
   - **Cek Suasana Hati:** Pilih satu dari lima kondisi perasaan dan tingkat tekanan belajar opsional (0–10), atau tekan **Lewati**.
   - **Rencana Hari Ini:** Tambahkan tugas (maks. 120 karakter), pecah menjadi langkah kecil, beri tanda Penting/Mendesak, serta tambahkan blok istirahat atau tidur pribadi.
   - **Pengingat:** Secara bawaan nonaktif (**OFF**). Mendukung pengingat dalam aplikasi maupun **Push Eksternal Browser (L01 • Opt-In)** yang menghormati jam tenang, berteks netral, dan dapat dicabut per perangkat kapan saja.
3. **Tenang & Pustaka (`/app/tenang` atau `/pustaka`):** Pilih satu latihan 3–5 menit, tekan **Mulai Latihan**, gunakan **Jeda/Lanjut**, atau tekan **Berhenti** kapan saja tanpa dianggap gagal. Tersedia ilustrasi serta toggle opt-in **Audio Panduan Opsional** tanpa autoplay; teks selalu lengkap bila audio nonaktif. Buka **Baca Sebentar** (dapat diakses offline sebagai PWA untuk katalog publik bebas sesi).
4. **Catat (`/app/catat`):** Tulis situasi, pikiran, perasaan, dan alternatif realistis (opsional). Draf tidak disimpan ke `localStorage`; perubahan tersimpan hanya setelah kamu menekan **Simpan Jurnal**.
5. **Refleksi (`/app/refleksi`):** Jawab tiga pertanyaan mingguan (Senin–Minggu) dan pilih tag strategi terkurasi opsional.
6. **Butuh Bicara? (`/bantuan` atau `/app/bantuan`):** Tinjau jam layanan dan kontak terverifikasi sekolah. Untuk mengirim permintaan bantuan melalui aplikasi, isi formulir lalu klik **Tinjau Permintaan** sebelum mengirim ke pengelola (Superadmin). Isi jurnal dan nilai mood tidak ikut terkirim secara otomatis.
7. **Pengaturan Akun:** Klik kode akunmu di kanan atas untuk mengubah kata sandi, **mengunduh ekspor data pribadimu (JSON/CSV setelah autentikasi ulang)**, menarik persetujuan data, menghapus seluruh entri, atau meminta penghapusan akun permanen.

## 2. Panduan Guru BK (`bk` — Pemantauan Read-Only)

1. Masuk di `/masuk` menggunakan kode/email staf dan kata sandi, lalu selesaikan verifikasi 6 digit TOTP (atau kode pemulihan sekali pakai).
2. Di `/bk`, pantau ringkasan agregat mingguan (ditahan otomatis dengan pesan *"Data belum cukup untuk ditampilkan"* jika kontributor berbeda `< 5` siswa) dan tabel metadata aktivitas siswa dalam kelompok penugasanmu. Guru BK juga dapat mengunduh **Ekspor Ringkasan Agregat Tersupresi (JSON/CSV)** dengan autentikasi ulang.
3. Guru BK **tidak** dapat membaca isi jurnal/refleksi/mood/skor/pesan bantuan dan **tidak** dapat mengubah data bisnis, akun, maupun konten. Kamu tetap dapat mengubah kata sandi sendiri dari menu akun.

## 3. Panduan Superadmin (`superadmin`)

1. Masuk di `/masuk` dan selesaikan verifikasi MFA TOTP.
2. Gunakan 6 tab di `/superadmin`:
   - **Ringkasan:** Lihat metrik operasional dan log audit terbaru.
   - **Akun & Role:** Buat akun baru (salin token aktivasi sekali pakai untuk didistribusikan lewat prosedur sekolah), ubah status/role, terbitkan token pemulihan, dan atur penugasan Guru BK.
   - **Data Siswa:** Pilih siswa untuk meninjau/mengelola entri pribadi termasuk isi jurnal dan status verifikasi wali (setiap akses tercatat otomatis di log audit).
   - **Konten:** Buat draf artikel/latihan serta kelola status `draft -> in_review -> approved -> published -> archived`.
   - **Bantuan & Pesan:** Tindak lanjuti permintaan bantuan siswa, perbarui status (`acknowledged`, `follow_up`, `closed`), kirim satu respons administratif berversi, dan terbitkan pesan kelompok satu arah.
   - **Pengaturan & Audit:** Atur nama sekolah, zona waktu IANA, jam layanan, kebijakan persetujuan wali, jalankan snapshot/retensi manual, **catat keputusan tinjauan ahli & pengelola sekolah (Gerbang Pilot T73)**, unduh **Ekspor Agregat & Audit**, pantau **Kapasitas Pool/Kuota & Provisioning Sekolah Mitra (L05)**, serta pantau seluruh log audit tersanitasi.


## Editor Superadmin setelah audit

Pada Data Siswa, pilih akun dan jenis data. Daftar berpaginasi menyediakan tambah/edit/hapus jurnal, mood, refleksi, tugas/langkah, jadwal dan pengingat. Cantumkan alasan perubahan atau penghapusan. Konflik versi mengharuskan memuat ulang editor. Riwayat latihan dan respons skrining asli dapat dibaca/dihapus; pencatatan baru dilakukan melalui aktivitas siswa. Setiap pembacaan dan perubahan dicatat pada audit.

Pada Konten, pilih Buat Artikel/Latihan Baru atau Edit pada entri. Isi sumber, hak media serta petunjuk latihan. Setelah perubahan isi, versi naik dan status kembali draf. Ajukan tinjauan, masukkan referensi peninjau, setujui, lalu terbitkan. Persetujuan/referensi demo bukan pengesahan ahli untuk pilot.

Saat meninggalkan jurnal yang belum tersimpan, pilih Kembali Mengedit, Simpan Perubahan, atau Buang Perubahan. Kegagalan koneksi mempertahankan draf di memori; simpan ulang sebelum menutup browser. Penghapusan seluruh entri mencakup bantuan dan respons administratif; hapus akun juga mencabut sesi.
