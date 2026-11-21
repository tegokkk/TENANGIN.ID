export const SIMULATION_SCREENING_FIXTURE = {
  code: 'simulasi-refleksi-beban-v1',
  version: 'sim-1.0',
  title: 'Simulasi Gambaran Beban Belajar (Contoh Tata Letak)',
  description:
    'Simulasi, bukan hasil penilaian. Contoh ini hanya menunjukkan alur pengisian skala deskriptif dan menunggu pengesahan instrumen oleh ahli BK sebelum digunakan dengan data nyata.',
  reference_period: '7 hari terakhir (Mode Simulasi)',
  is_simulation: true,
  is_approved: false,
  approval_ref: null,
  status: 'active',
  items: [
    {
      id: 'sim_1',
      prompt: 'Dalam simulasi ini, seberapa sering tugas sekolah terasa menumpuk di waktu bersamaan?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Jarang / tidak terasa' },
        { value: 1, label: 'Kadang-kadang' },
        { value: 2, label: 'Cukup sering' },
        { value: 3, label: 'Hampir setiap hari' },
      ],
    },
    {
      id: 'sim_2',
      prompt: 'Dalam simulasi ini, seberapa mudah kamu menyisihkan waktu jeda istirahat saat belajar?',
      required: true,
      min: 0,
      max: 3,
      reverseScored: true,
      options: [
        { value: 0, label: 'Sangat sulit' },
        { value: 1, label: 'Agak sulit' },
        { value: 2, label: 'Cukup mudah' },
        { value: 3, label: 'Mudah dilakukan' },
      ],
    },
    {
      id: 'sim_3',
      prompt: 'Dalam simulasi ini, seberapa sering pikiran tentang nilai mengganggu waktu tidurmu?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Tidak pernah' },
        { value: 1, label: 'Sesekali' },
        { value: 2, label: 'Beberapa malam' },
        { value: 3, label: 'Hampir setiap malam' },
      ],
    },
  ],
  scoring_rules: {
    scaleMin: 0,
    scaleMax: 3,
    incompleteMessage:
      'Simulasi belum lengkap: jawaban kosong tidak dianggap nol. Lengkapi semua butir simulasi atau gunakan tombol Butuh bicara? bila perlu.',
    defaultSupportMessage:
      'Simulasi, bukan hasil penilaian klinis. Tidak ada skor diagnosis atau peringatan otomatis ke guru/wali.',
    bands: [
      {
        min: 0,
        max: 4,
        label: 'Simulasi, bukan hasil penilaian (Gambaran contoh A)',
        supportMessage:
          'Ini adalah keluaran simulasi untuk meninjau alur UI & skoring server. Gunakan latihan napas atau perencana jika ingin mengatur jeda belajar.',
      },
      {
        min: 5,
        max: 9,
        label: 'Simulasi, bukan hasil penilaian (Gambaran contoh B)',
        supportMessage:
          'Ini adalah keluaran simulasi untuk meninjau alur UI & skoring server. Tombol Butuh bicara? selalu tersedia secara sukarela di setiap hasil.',
      },
    ],
  },
};
