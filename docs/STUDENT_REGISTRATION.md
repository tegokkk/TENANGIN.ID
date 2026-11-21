# Pendaftaran siswa dan persetujuan akun

**Alur aktif terbaru:** ruang layanan TENANGIN.ID memakai `account_approval`. Setelah akun disetujui, fitur utama langsung dapat dipakai tanpa tahapan persetujuan tambahan. Tidak dibuat persetujuan kebijakan/wali otomatis. Lihat [STUDENT_DASHBOARD.md](STUDENT_DASHBOARD.md). Uraian gerbang persetujuan di bawah berlaku bila pengelola memilih mode `consent`.

Perbaikan 20 November 2026: setelah disetujui, siswa langsung masuk ke `/app` (`nextStep: student_home`), termasuk ketika belum ada kebijakan data aktif. Persetujuan data tidak lagi menjadi tahapan login. Pustaka, latihan tanpa pencatatan, Bantuan, dan pengaturan akun tetap tersedia. Cek mood, jurnal, perencana, refleksi, riwayat latihan, dan pengiriman bantuan pribadi tetap memerlukan persetujuan melalui `/app/persetujuan`; halaman pribadi menampilkan status di dalam ruang siswa dan tidak mengulang login.

Jika kebijakan belum diterbitkan, siswa melihat status konfigurasi tanpa permintaan API pribadi yang pasti ditolak. Superadmin menyiapkan dan menerbitkan kebijakan yang ditinjau sekolah melalui **Pengaturan → Kebijakan Data Siswa**. Tidak ada kebijakan atau persetujuan wali yang dibuat otomatis. Jika sekolah mewajibkan persetujuan wali, persetujuan siswa yang tersimpan menampilkan status menunggu wali; login tetap aktif.

`GET /api/consent-policy` memerlukan sesi aktif, dibatasi ke sekolah akun, dan mengembalikan `200` dengan `policy: null` saat belum tersedia. Endpoint mutasi pribadi tetap menolak dengan `CONSENT_REQUIRED` sampai persyaratan persetujuan terpenuhi.

Siswa membuka tab Siswa pada halaman masuk, memilih Daftar Akun, lalu mengisi nama, NISN 10 digit, kelas, sandi, dan konfirmasi sandi. Jika terdapat beberapa ruang layanan aktif, siswa memilih tujuan. Untuk satu ruang layanan, sistem menentukannya otomatis.

Pendaftaran menunggu persetujuan. Sandi disimpan sebagai hash Argon2; respons tidak berisi sandi, hash, atau token aktivasi. Tidak dibuat sesi login atau persetujuan data pribadi. NISN unik secara global karena login siswa menggunakan NISN. Kapasitas diperiksa dalam transaksi agar pendaftaran paralel tidak melewati kuota.

Superadmin melihat jumlah pendaftaran pada ringkasan dashboard. Buka Akun & Role, lalu Pendaftaran Siswa untuk memeriksa nama, NISN, dan kelas. Setujui & Aktifkan membuka login menggunakan sandi yang dipilih siswa. Tolak membuat akun tidak dapat masuk. Identitas peninjau, keputusan, dan waktu dicatat dalam audit. Hanya pendaftaran milik ruang layanan Superadmin yang dapat ditinjau; siswa dan BK tidak dapat mengakses antrean atau menyetujui.

Setelah disetujui, siswa masuk dengan NISN dan sandi. Persetujuan pengelolaan data pribadi tetap diminta secara terpisah sebelum fitur pribadi tersedia. Persetujuan akun bukan persetujuan pengguna atau wali.

Form aktivasi token publik dihapus. Rute /aktivasi diarahkan ke /daftar; API /auth/activate mengembalikan 410. Pemulihan sandi tidak dapat mengaktifkan akun yang masih menunggu atau ditolak. Akun yang dibuat langsung oleh Superadmin menggunakan sandi awal dari dashboard dan langsung aktif, termasuk admin awal sekolah mitra. Tidak diterbitkan token aktivasi.

Migration 202611200006_student_registration_approval menambahkan status/tanggal/peninjau pendaftaran serta keunikan NISN global. Migrasi mempertahankan akun lama dan menolak bila terdapat NISN ganda yang perlu diperiksa operator. Tidak diisi akun atau pendaftaran contoh ke database aplikasi.

Pendaftaran yang ditolak dapat diperbaiki melalui formulir daftar pada ruang layanan yang sama. Permohonan baru memakai ID baru dan sandi yang baru dipilih, tetap memerlukan persetujuan. Jejak keputusan lama tetap ada pada audit; keputusan terlambat untuk ID lama tidak dapat mengaktifkan permohonan baru. Pada ponsel, antrean ditampilkan sebagai kartu agar identitas dan tombol persetujuan dapat dibaca tanpa menggeser tabel.
