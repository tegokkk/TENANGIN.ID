# Akses dan fungsi dashboard siswa

Alur operasional terbaru, 20 November 2026: ruang layanan TENANGIN.ID memakai `account_approval`. Akun siswa yang disetujui Superadmin langsung dapat menggunakan fitur utama. Tidak dibuat persetujuan siswa atau wali secara otomatis. Ruang layanan lama tetap memakai mode `consent` sampai pengelola mengubahnya melalui Pengaturan → Akses Fitur Siswa.

`consentStatus.canUsePersonalFeatures` dipakai bersama oleh UI dan API. `hasActiveConsent` tetap menyatakan fakta persetujuan kebijakan; nilainya bisa false ketika akses berbasis persetujuan akun aktif. Akun pending, ditolak, nonaktif, dan siswa lain tetap tidak dapat melewati autentikasi, peran, CSRF, kepemilikan data, enkripsi, dan audit.

Siswa dapat menjeda pencatatan melalui Pengaturan Akun. Jeda disimpan pada `users.personal_access_paused_at`, menonaktifkan pengingat, mencabut langganan push, serta mengeluarkan siswa dari agregasi/metadata BK. `POST /api/consents/resume` hanya dapat dipakai siswa aktif dalam mode `account_approval`. Pada mode `consent`, endpoint tersebut tidak dapat melewati kebijakan atau keputusan wali.

| Fitur | Perilaku |
| --- | --- |
| Mood | Tersimpan per tanggal sekolah |
| Perencana | Tugas, langkah, status, dan blok istirahat tersimpan |
| Pengingat | Preferensi tersimpan; push memerlukan dukungan dan izin perangkat |
| Tenang | Mulai, jeda, lanjut, berhenti, dan riwayat sesi |
| Catat | Catatan terenkripsi dapat disimpan, dibuka, diubah, dan dihapus |
| Refleksi | Minggu berjalan dibuka kembali setelah reload, pembaruan memakai versi tersimpan |
| Bantuan | Pesan terenkripsi masuk antrean Superadmin; tersimpan bukan berarti telah dibaca |
| Privasi | Jeda pencatatan, ekspor, hapus entri, dan hapus akun |

Bootstrap ruang layanan baru memakai `account_approval`, MFA opsional, dan Superadmin sebagai penerima permintaan bantuan aplikasi. Kontak eksternal dan jam kerja tetap memerlukan informasi sebenarnya.

Panduan bawaan terdiri dari satu jeda belajar dan tiga artikel petunjuk penggunaan aplikasi. Konten produk asli ini tidak mengisi akun, aktivitas siswa, hasil skrining, kontak, peninjau ahli, atau pengesahan rekaan. Instalasi idempotent dan tidak menimpa konten pengelola. Pengatur langkah mengikuti durasi setiap instruksi, termasuk setelah Langkah Berikutnya ditekan. Panduan tanpa audio ditandai sebagai panduan teks.

Skrining klinis tetap memerlukan instrumen dan pengesahan yang sah. Tidak dibuat instrumen atau skor simulasi untuk mengisi fitur. Domain, review tata kelola, kontak sekolah, dan layanan eksternal adalah konfigurasi terpisah.

Pengujian dashboard bersih mendaftarkan dan menyetujui siswa melalui API, lalu menguji penyimpanan seluruh fitur utama tanpa kebijakan atau persetujuan otomatis. Pengujian browser mencakup 320/390/1280 piksel, reload, navigasi, jeda/aktifkan kembali, respons API, dan kesalahan JavaScript. Semua pengujian memakai database khusus test.

Penyempurnaan antarmuka 21 November 2026: pintasan aktivitas muncul sebelum daftar tugas pada layar kecil. Jadwal, pengingat, pesan, dan privasi dipisahkan menjadi kartu; panel yang dibuka memakai lebar penuh pada desktop. Formulir tugas memakai dua kolom tanggal/estimasi saat ruang mencukupi, dan langkah tugas turun ke satu kolom pada ponsel.

Dialog ditampilkan melalui portal dengan judul dan tombol tutup yang tetap terlihat ketika isi digulir. Draf jadwal pengingat terpisah dari preferensi tersimpan sehingga Batal tidak mengubah ringkasan. Galat simpan istirahat/pengingat terlihat di dalam dialog, isian tetap terjaga, dan simpan dapat dicoba ulang. Galat langkah tugas, penghapusan jadwal, pemuatan panel tambahan, serta penyimpanan sesi latihan diberi umpan balik. Tombol pengiriman dinonaktifkan selama permintaan terkait diproses.

Menu tindakan Superadmin mempertahankan fokus tanpa menggulir halaman saat dibuka. Navigasi HTML publik PWA mengambil build terbaru terlebih dahulu dan menggunakan cache saat jaringan terputus, sehingga halaman tidak terus memuat referensi bundle lama setelah pembaruan. Halaman akun dan API pribadi tetap melewati cache.
