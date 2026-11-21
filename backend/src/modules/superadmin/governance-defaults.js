export const DEFAULT_GOVERNANCE_DOMAINS = [
  {
    domainCode: 'D1_IDENTITAS_ZONA',
    title: 'D1 Identitas Sekolah, Zona Waktu & Kelompok',
    scopeSummary: 'Pengesahan nama resmi sekolah, zona waktu IANA (WIB/WITA/WIT), serta pengelompokan siswa aktif.',
  },
  {
    domainCode: 'D2_SKRINING_INSTRUMEN',
    title: 'D2 & D3 Instrumen Skrining, Lisensi & Skoring',
    scopeSummary: 'Pemilihan instrumen psikometrik sah, izin hak pakai, aturan skoring, dan naskah respons dukungan.',
  },
  {
    domainCode: 'D4_PERSETUJUAN_WALI',
    title: 'D4 Kebijakan Persetujuan Data & Verifikasi Wali',
    scopeSummary: 'Penetapan mekanisme verifikasi wali dan pengesahan teks persetujuan versi pilot.',
  },
  {
    domainCode: 'D5_AGREGAT_SUPRESI',
    title: 'D5 & D6 Ambang Agregat (k >= 5) & Supresi',
    scopeSummary: 'Pengesahan ambang privasi k = 5 dan evaluasi risiko identifikasi pada kelompok kecil.',
  },
  {
    domainCode: 'D7_KONTAK_JAM_BANTUAN',
    title: 'D7 Petugas, Jam Layanan, Kontak & SOP Bantuan',
    scopeSummary: 'Penetapan petugas Superadmin pengelola, jam layanan sekolah nyata, dan kontak rujukan resmi.',
  },
  {
    domainCode: 'D8_AKSES_SUPERADMIN_AUDIT',
    title: 'D8 Tata Kelola Akses Pribadi Superadmin & Audit',
    scopeSummary: 'Evaluasi kewenangan akses data pribadi oleh Superadmin sekolah dan prosedur pemeriksaan log audit.',
  },
  {
    domainCode: 'D10_RETENSI_HAPUS',
    title: 'D10 Jadwal Retensi, Penghapusan & Backup/Restore',
    scopeSummary: 'Pengesahan masa simpan data (retention days), prosedur pemusnahan akun, dan uji pemulihan berkala.',
  },
  {
    domainCode: 'D13_MATERI_LATIHAN',
    title: 'D13 Tinjauan Materi Pustaka, Latihan, Audio & Visual',
    scopeSummary: 'Pemeriksaan dua putaran oleh ahli materi & media atas artikel, naskah latihan, instruksi berhenti, audio, dan ilustrasi.',
  },
];

export function buildGovernanceSeedRows(cryptoModule, schoolId) {
  return DEFAULT_GOVERNANCE_DOMAINS.map((item) => ({
    id: cryptoModule.randomUUID(),
    school_id: schoolId,
    domain_code: item.domainCode,
    title: item.title,
    scope_summary: item.scopeSummary,
    status: 'pending_review',
    reviewer_name: null,
    reviewer_role: null,
    decision_notes: null,
    revision_notes: null,
    reviewed_at: null,
    updated_by_user_id: null,
    version: 1,
  }));
}
