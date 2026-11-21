> Hanya fixture pengujian terisolasi. Akun pada dokumen ini tidak tersedia di database aplikasi. Seed runtime dinonaktifkan; gunakan db:seed:test hanya pada environment/database test. Akses Superadmin resmi disiapkan melalui bootstrap operator.

# Akun Terdaftar & Kredensial Sistem

Seluruh data demo fiktif dan akun simulasi lama (`Awan-*`, `BK-Rani-*`, `Admin-Root-*`, dsb.) **telah dibersihkan secara permanen**. Database hanya memuat 3 akun resmi aktif untuk masing-masing peran dengan alur login langsung tanpa kode-kodean MFA:

---

## 1. Akun Siswa (`role: student`) — Sisi Kiri (Masuk Siswa)

| Nama Siswa | Sekolah | NISN (Login Utama) | Kata Sandi | Status | Keterangan |
| --- | --- | --- | --- | --- | --- |
| **Budi Santoso** | SMA Negeri 1 Contoh | `0081234567` | `SiswaPassword!2026` | Aktif + Persetujuan v1.1 | Akun siswa utama (Mood, Catatan, Latihan, Bantuan) |

*Tersedia tombol satu klik **"Gunakan"** pada daftar akun di halaman login siswa untuk langsung mengisi form.*

---

## 2. Akun Guru BK (`role: bk` — Read-Only) — Sisi Kanan (Masuk Guru BK & Superadmin)

| Nama Staf | Email Login | Kata Sandi | Penugasan Aktif | Mode Masuk |
| --- | --- | --- | --- | --- |
| **Ibu Dewi Sartika, S.Pd.** | `bk@sekolah.sch.id` | `StafPassword!2026` | `Kelas X` & `Kelas XI` | **Langsung masuk Dashboard BK** (tanpa MFA) |

---

## 3. Akun Superadmin (`role: superadmin` — Kendali Penuh Teraudit) — Sisi Kanan

| Nama Administrator | Email Login | Kata Sandi | Cakupan | Mode Masuk |
| --- | --- | --- | --- | --- |
| **Administrator Utama** | `admin@sekolah.sch.id` | `AdminPassword!2026` | Semua Tab & Modul Tata Kelola | **Langsung masuk Dashboard Superadmin** (tanpa MFA) |
