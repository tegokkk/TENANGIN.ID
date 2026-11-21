# Keterbatasan Prototipe & Daftar Tinjauan Ahli / Sekolah (T73)

Dokumen ini mencatat keterbatasan prototipe saat ini serta daftar keputusan terbuka yang **wajib disahkan oleh sekolah, guru BK, ahli materi, dan ahli media** sebelum aplikasi dijalankan dengan data siswa nyata (`APP_MODE=pilot`).

## 1. Keterbatasan Prototipe Saat Ini

1. **Dataset Contoh Tiruan:** Seluruh data awal pada mode demo adalah fiktif.
2. **Skrining Mandiri (F2):** Belum mengaktifkan instrumen psikometrik nyata. Pada mode demo tersedia satu fixture berlabel jelas _"Simulasi, bukan hasil penilaian"_; pada mode pilot tanpa instrumen disahkan, UI otomatis menampilkan _"Instrumen belum tersedia"_.
3. **Pengingat (`F6` & `L01`) & PWA (`L02`):** Mendukung pengingat dalam aplikasi, Push Notification Web eksternal opt-in (VAPID AES-128-GCM, hormat jam tenang, pengetesan perangkat, pencabutan), dan instalasi PWA dengan Service Worker yang hanya meng-cache aset & katalog publik (tanpa data pribadi). Pada mode demo tanpa push gateway produksi, uji perangkat berjalan dengan pelaporan aman lokal/simulasi.
4. **Audio & Ilustrasi Latihan (`F4` & `L03`):** Dilengkapi panduan audio internal opsional (tanpa autoplay, disintesis bebas hak cipta di `/audio/*.wav`) dan ilustrasi SVG internal, sementara seluruh panduan teks tetap dapat dijalankan 100% tanpa audio.
5. **Bukti Efektivitas:** Keberhasilan uji fungsi/keamanan/E2E **tidak** membuktikan efektivitas penurunan stres secara klinis. Paket pemeriksaan isi terperinci untuk peninjau manusia tersedia di [REVIEW_PACK_T73.md](./REVIEW_PACK_T73.md) dan panel catatan tinjauan di Dashboard Superadmin (`Tab 6`).

## 2. Checklist Tinjauan Ahli & Pengelola Sekolah (T73 — Terbuka)

| Area Keputusan             | Pertanyaan / Item yang Harus Disahkan                                                                                           | Status                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| D1 Identitas & Zona Waktu  | Nama resmi sekolah, zona waktu IANA (`Asia/Jakarta`/`Makassar`/`Jayapura`), dan kelompok siswa                                  | Menunggu pengesahan sekolah      |
| D2 & D3 Instrumen Skrining | Pemilihan instrumen tervalidasi, hak pakai/lisensi, skor batas, dan naskah pesan dukungan resmi                                 | Menunggu pengesahan ahli BK      |
| D4 Persetujuan & Wali      | Apakah verifikasi izin wali diwajibkan (`guardian_consent_required`) dan teks kebijakan persetujuan versi pilot                 | Menunggu pihak berwenang sekolah |
| D5 & D6 Agregat & Supresi  | Pengesahan ambang `k = 5` (atau penghentian metrik tertentu jika kelompok pilot 8–10 siswa tetap mudah dikenali)                | Menunggu tinjauan ahli & sekolah |
| D7 Layanan Bantuan         | Penetapan petugas pengelola Superadmin, jam layanan nyata, kontak terverifikasi, dan SOP koordinasi tatap muka BK               | Menunggu penetapan sekolah       |
| D13 Materi & Latihan       | Tinjauan dua putaran oleh ahli materi & ahli media terhadap 6 artikel F8, naskah napas/otot/mindfulness, dan instruksi berhenti | Menunggu tinjauan ahli (T73)     |

## 3. Status sesudah perbaikan audit teknis

Restore mempertahankan ledger penghapusan, aktivitas pribadi memiliki cleanup retensi, eligibility persetujuan/izin wali berlaku pada agregat dan metadata BK, recovery MFA dikonsumsi atomik, dan perubahan isi konten selalu memerlukan versi/review baru. Editor Superadmin serta perlindungan draf diuji melalui browser. Lihat docs/audit/audit-fixes-2026-11-20.md untuk bukti akhir.

Perbaikan kode tidak mengesahkan akses Superadmin atau monitoring siswa untuk sekolah nyata. T73 harus memutuskan ulang akses tersebut, ambang/supresi, retensi (termasuk akhir evaluasi dan audit), kontak, hak media, instrumen, izin wali dan SOP. Jika keputusan sekolah berbeda dari PRD 1.1, ubah matriks izin, kebijakan persetujuan dan tes sebelum pilot. Pemulihan total ke database kosong juga memerlukan ledger eksternal terbaru; jadwal serta penyimpanan backup/ledger dikelola operator sesuai runbook.
