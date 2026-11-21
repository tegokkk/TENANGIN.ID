/**
 * Template Instrumen Skrining Mandiri Tervalidasi untuk Uji Coba Pilot (Data Nyata).
 * Diadaptasi dari domain regulasi emosi & skala ketegangan belajar akademik siswa SMA/MA.
 * Instrumen ini bersifat deskriptif, suportif, dan bukan alat diagnosis klinis.
 */
export const PILOT_VALIDATED_SCREENING_TEMPLATE = {
  code: 'skrining-stres-akademik-sma-v1',
  version: 'v1.0',
  title: 'Skala Regulasi & Ketegangan Akademik Siswa (SRKB-10)',
  description:
    'Instrumen pemetaan ketegangan belajar mandiri dan refleksi regulasi emosi untuk siswa SMA/MA. Bersifat deskriptif, suportif, dan bukan diagnosis medis.',
  reference_period: '14 hari terakhir',
  is_simulation: false,
  is_approved: true,
  approval_ref: 'SK-BK-PENGESAHAN-2026/01',
  status: 'active',
  items: [
    {
      id: 'srkb_1',
      prompt: 'Seberapa sering kamu merasa lelah fisik saat tugas sekolah menumpuk di waktu bersamaan?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Tidak pernah / jarang sekali' },
        { value: 1, label: 'Kadang-kadang' },
        { value: 2, label: 'Cukup sering' },
        { value: 3, label: 'Hampir setiap hari' },
      ],
    },
    {
      id: 'srkb_2',
      prompt: 'Seberapa mudah bagimu untuk menyisihkan waktu istirahat sejenak di sela-sela belajar?',
      required: true,
      min: 0,
      max: 3,
      reverseScored: true,
      options: [
        { value: 0, label: 'Sangat sulit dilakukan' },
        { value: 1, label: 'Agak sulit' },
        { value: 2, label: 'Cukup mudah' },
        { value: 3, label: 'Sangat mudah dilakukan' },
      ],
    },
    {
      id: 'srkb_3',
      prompt: 'Seberapa sering pikiran tentang nilai atau ujian membuatmu sulit tidur nyenyak di malam hari?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Tidak pernah' },
        { value: 1, label: 'Satu atau dua malam' },
        { value: 2, label: 'Beberapa malam dalam seminggu' },
        { value: 3, label: 'Hampir setiap malam' },
      ],
    },
    {
      id: 'srkb_4',
      prompt: 'Seberapa sering kamu merasakan ketegangan fisik (seperti otot leher kaku atau sakit kepala) saat belajar lama?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Jarang / tidak pernah' },
        { value: 1, label: 'Kadang-kadang' },
        { value: 2, label: 'Cukup sering' },
        { value: 3, label: 'Hampir setiap hari' },
      ],
    },
    {
      id: 'srkb_5',
      prompt: 'Seberapa sering kamu merasa kewalahan hingga menunda tugas karena tidak tahu harus mulai dari mana?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Jarang / tidak pernah' },
        { value: 1, label: 'Kadang-kadang' },
        { value: 2, label: 'Cukup sering' },
        { value: 3, label: 'Sangat sering' },
      ],
    },
    {
      id: 'srkb_6',
      prompt: 'Seberapa mampu kamu memilah mana tugas yang mendesak dan mana yang bisa dikerjakan nanti?',
      required: true,
      min: 0,
      max: 3,
      reverseScored: true,
      options: [
        { value: 0, label: 'Sangat sulit memilah' },
        { value: 1, label: 'Kadang bingung memilah' },
        { value: 2, label: 'Cukup mampu memilah' },
        { value: 3, label: 'Sangat mampu memilah' },
      ],
    },
    {
      id: 'srkb_7',
      prompt: 'Seberapa sering kamu merasa khawatir berlebihan akan mengecewakan guru atau orang tua terkait hasil belajar?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Jarang / tidak pernah' },
        { value: 1, label: 'Kadang-kadang' },
        { value: 2, label: 'Cukup sering' },
        { value: 3, label: 'Hampir setiap waktu' },
      ],
    },
    {
      id: 'srkb_8',
      prompt: 'Seberapa sering kamu merasa harus menanggung seluruh kesulitan belajar sendirian tanpa tempat bercerita?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Tidak pernah / punya teman cerita' },
        { value: 1, label: 'Kadang-kadang' },
        { value: 2, label: 'Cukup sering' },
        { value: 3, label: 'Hampir selalu merasa sendiri' },
      ],
    },
    {
      id: 'srkb_9',
      prompt: 'Saat merasa panik atau tegang menghadapi ujian, seberapa mampu kamu menenangkan dirimu kembali?',
      required: true,
      min: 0,
      max: 3,
      reverseScored: true,
      options: [
        { value: 0, label: 'Sangat sulit tenang' },
        { value: 1, label: 'Butuh waktu lama untuk tenang' },
        { value: 2, label: 'Bisa tenang secara bertahap' },
        { value: 3, label: 'Cepat bisa tenang kembali' },
      ],
    },
    {
      id: 'srkb_10',
      prompt: 'Seberapa sering kamu merasa membutuhkan ruang tenang sejenak tanpa tuntutan belajar untuk memulihkan energi?',
      required: true,
      min: 0,
      max: 3,
      options: [
        { value: 0, label: 'Jarang merasa butuh' },
        { value: 1, label: 'Kadang-kadang butuh' },
        { value: 2, label: 'Cukup sering butuh' },
        { value: 3, label: 'Sangat butuh setiap hari' },
      ],
    },
  ],
  scoring_rules: {
    scaleMin: 0,
    scaleMax: 3,
    incompleteMessage:
      'Instrumen belum lengkap: semua butir pertanyaan wajib dijawab agar gambaran deskriptif akurat.',
    defaultSupportMessage:
      'Hasil ini merupakan refleksi mandiri untuk membantumu mengenali kondisi belajarmu. Hasil ini bukan diagnosis medis atau label kepribadian.',
    bands: [
      {
        min: 0,
        max: 9,
        label: 'Ketegangan Belajar Terkelola',
        supportMessage:
          'Kondisi belajarmu saat ini cukup seimbang. Terus pertahankan pola istirahat teratur dan luangkan jeda untuk menjaga energimu.',
      },
      {
        min: 10,
        max: 18,
        label: 'Ketegangan Belajar Sedang',
        supportMessage:
          'Ada tanda ketegangan belajar yang mulai menumpuk. Kamu bisa mencoba latihan napas terpandu di menu Tenang atau memecah tugas menjadi langkah kecil di Perencana.',
      },
      {
        min: 19,
        max: 30,
        label: 'Ketegangan Belajar Tinggi (Perlu Dukungan)',
        supportMessage:
          'Beban belajar terasa cukup berat saat ini. Sangat disarankan untuk meluangkan waktu istirahat yang cukup dan berdiskusi dengan Guru BK untuk membantu menyusun prioritas belajarmu secara tenang.',
      },
    ],
  },
};
