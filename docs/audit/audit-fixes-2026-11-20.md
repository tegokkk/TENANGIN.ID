# Penutupan Temuan Audit TENANGIN.ID

Tanggal: 20 November 2026. Ruang lingkup: seluruh temuan audit implementasi dan konflik Markdown/TASKLIST. Ini catatan verifikasi teknis demo, bukan pengesahan pilot atau efektivitas.

## Keputusan acuan

Arah TASKLIST dan implementasi dipertahankan: student milik sendiri, BK read-only metadata sesuai penugasan/izin, Superadmin dengan akses isi pribadi teraudit dan pemberitahuan persetujuan. PRD v1.1 Bagian 4.2/26, design v2.1 dan structure v1.2 kini konsisten. Dokumen v1.0 tersedia di docs/archive, ditandai historis. Persetujuan akses tersebut untuk sekolah nyata tetap keputusan T73.

## Pemetaan reproduksi backend

| ID | Temuan sebelum perbaikan | Hasil yang dipastikan setelah perbaikan |
| --- | --- | --- |
| R01 | Cleanup meninggalkan jurnal lama | Mood, skrining, jurnal, sesi, tugas/langkah, jadwal dan refleksi lama dibersihkan; entri baru dipertahankan |
| R02 | Restore backup lama menghidupkan akun terhapus | Ledger lokal disalin sebelum tabel diganti, akun terhapus dipurge lagi, seluruh sesi dicabut; ledger eksternal dapat dipasok CLI untuk pemulihan total |
| R03 | Artikel terbit berubah tanpa review/versi baru | Server mendeteksi perubahan isi tanpa mempercayai flag klien, menaikkan versi, kembali draf, mencabut reviewer/publikasi; endpoint publik menjadi 404 sampai review/publikasi baru |
| R04 | Scope/wali/policy tidak membatasi agregat | Satu policy eligibility bersama memeriksa akun aktif, kebijakan aktif, accepted, belum ditarik, scope personal/agregat dan wali |
| R05 | Metadata siswa yang menarik izin tetap tampil ke BK | Endpoint monitoring memakai eligibility yang sama dan tidak mengembalikan riwayat siswa tersebut |
| R06 | Snapshot lama tetap tampil setelah kebijakan berubah | Aktivasi kebijakan menginvalidasi snapshot; dashboard tidak menampilkan snapshot yang menunggu hitung ulang |
| R07 | Minggu berjalan dapat diterbitkan | API menolak tanggal tidak valid/bukan Senin/minggu belum selesai; pembacaan BK juga membatasi periode selesai |
| R08 | Recovery MFA dapat dipakai dua kali secara paralel | Pembacaan/pengurangan hash berada di transaksi dengan row lock; satu dari enam request berhasil |
| R09 | Zona waktu palsu membuat API mood 500 | Schema IANA memvalidasi sekolah dan pengingat; input palsu 400 dan mood tetap 200 |
| R10 | Mutasi latihan tidak diaudit | Buat/edit/transisi artikel dan latihan disertai audit dalam transaksi yang sama |
| R11 | Sesi 0 detik dapat selesai | Sesi menyimpan durasi konfigurasi saat mulai; completed menuntut durasi terpenuhi, stopped tetap diperbolehkan |
| R12 | Hapus seluruh entri meninggalkan isi bantuan | Penghapusan entri mencakup bantuan/event/respons, metadata dan delivery; restore menerapkan ulang ledger entri berdasarkan waktu permintaan |

Tes: backend/tests/integration/audit-regressions.test.js. Supresi sekunder juga diperbaiki untuk lebih dari dua subkelompok dan diuji di core-domain.test.js. Tes restore yang lama kini memakai jalur pemanggilan yang sama dengan CLI, tanpa memasok ledger lokal secara manual.

## Perbaikan UI dan pengelolaan

- Draf jurnal memakai navigation blocker: kembali mengedit, simpan berhasil lalu berpindah, atau buang eksplisit. Offline/reconnect tidak menghapus input; konflik dua tab mempertahankan draf lama.
- Dialog mengelola fokus awal, Tab/Shift+Tab, Escape, pengembalian fokus dan batas tinggi. Grid/flex, tombol, badge, helper, skip link dan teks kontak membungkus pada layar kecil/teks besar; overflow tidak ditutupi lewat body overflow-x hidden.
- Editor Superadmin menyediakan CRUD jurnal, mood, refleksi, tugas/langkah, jadwal dan pengingat dengan alasan/audit. Sesi dan jawaban skrining asli dapat dibaca/dihapus; perekaman baru berasal dari aktivitas siswa. Daftar berpaginasi; siswa/BK dan sekolah di luar scope tetap ditolak.
- Editor artikel/latihan memuat sumber, hak media, naskah/fase/durasi dan review/publikasi/arsip. Akun/role dapat diedit dari dialog. Konflik/constraint unik memberi error aman.
- Race logout pada cache sesi diperbaiki: UI langsung melepas autentikasi lokal, membersihkan cache dan tidak mengarahkan kembali ke ruang siswa dari data sesi lama.

## Verifikasi akhir

| Pemeriksaan | Hasil |
| --- | --- |
| npm test | 7 file backend / 32 tes dan 1 file frontend / 4 tes lulus |
| npm run test:e2e | 12/12 skenario Chromium lulus |
| npm run lint | Lulus kedua workspace |
| npm run build | Lulus, hasil pada frontend/dist |
| Migrasi | Migrasi durasi sesi berhasil pada database demo dan test |
| Dokumen/API | Tautan lokal dokumen utama valid; OpenAPI YAML valid dan seluruh parameter path dideklarasikan |

E2E mencakup seluruh halaman dan enam tab D08 pada 320/390/1280 px; teks 200% serta reduced motion pada landing/ruang siswa; fokus dialog dan skip link; offline/retry, dua tab/logout, editor artikel, editor latihan, CRUD tugas/langkah setelah reload, dan alur tiga role. Server E2E terisolasi di API 3001/Vite 5174, fixture direset sebelum setiap skenario dan ditolak bila database bukan lokal tenangin_test. Unit/integrasi dan E2E tidak dijalankan bersamaan.

## Batas yang tetap terbuka

T73 tetap memerlukan review langsung sekolah/ahli untuk materi, instrumen, izin wali, akses Superadmin/monitoring BK, ambang agregat, retensi, kontak dan SOP. Review visual/media akhir tidak digantikan oleh tes overflow. L01–L05 (push, PWA, audio tambahan, ekspor, kapasitas) tetap fase lanjutan. Pemulihan total ke database kosong memerlukan ledger eksternal terbaru; penyimpanan/jadwal backup dan ledger adalah tanggung jawab operator sesuai runbook. Tidak ada pilot data nyata atau deployment eksternal yang dilakukan.
