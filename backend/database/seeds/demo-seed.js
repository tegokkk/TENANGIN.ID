import crypto from 'node:crypto';
import { loadEnv } from '../../src/config/env.js';
import { createDatabase } from '../../src/config/database.js';
import { hashPassword } from '../../src/lib/password.js';
import { encryptSensitiveText } from '../../src/lib/encryption.js';
import { hashToken } from '../../src/lib/idempotency.js';
import {
  getLocalDateString,
  getWeekBounds,
  getLastCompletedWeekStart,
} from '../../src/lib/time.js';
import { SIMULATION_SCREENING_FIXTURE } from '../fixtures/simulation-screening.js';
import { computeWeeklySnapshots } from '../../src/modules/dashboard/aggregate-computation.service.js';
import { buildGovernanceSeedRows } from '../../src/modules/superadmin/governance-defaults.js';

export function assertSafeDemoSeedTarget(env) {
  if (env.NODE_ENV !== 'test') {
    throw new Error('Fixture hanya boleh diisi pada environment test.');
  }
  if (env.APP_MODE !== 'demo') {
    throw new Error('Seed demo ditolak: APP_MODE bukan "demo".');
  }
  if (!env.ALLOW_DEMO_SEED) {
    throw new Error('Seed demo ditolak: ALLOW_DEMO_SEED harus bernilai true.');
  }
  const dbTarget = env.TEST_DATABASE_URL || env.DATABASE_URL;
  const name = decodeURIComponent(new URL(dbTarget).pathname.slice(1));
  if (!/^tenangin(?:_[a-z0-9]+)*_test$/.test(name) || /pilot|prod/i.test(name)) {
    throw new Error('Fixture hanya boleh menargetkan database pengujian berakhiran _test.');
  }
}

export async function runDemoSeed(db, env) {
  assertSafeDemoSeedTarget(env);
  const target = await db.raw('SELECT current_database() AS name');
  const expected = decodeURIComponent(
    new URL(env.TEST_DATABASE_URL || env.DATABASE_URL).pathname.slice(1)
  );
  if (target.rows[0].name !== expected)
    throw new Error('Koneksi seed tidak cocok dengan database test.');
  const { keyRing, isTest } = env;
  const tz = 'Asia/Jakarta';
  const todayStr = getLocalDateString(new Date(), tz);
  const { weekStart: currentWeekStart, weekEnd: currentWeekEnd } = getWeekBounds(todayStr, tz);
  const lastWeekStart = getLastCompletedWeekStart(new Date(), tz);
  const { weekEnd: lastWeekEnd } = getWeekBounds(lastWeekStart, tz);

  await db.transaction(async (trx) => {
    await trx('schools').where({ code: 'SMA-CONTOH-01' }).del();

    const schoolId = crypto.randomUUID();
    await trx('schools').insert({
      id: schoolId,
      code: 'SMA-CONTOH-01',
      name: 'SMA Negeri 1 Contoh (Mode Contoh)',
      timezone: tz,
      service_hours: 'Senin - Jumat, 08:00 - 15:30 WIB (Ruang BK Gedung A Lt. 2)',
      verified_contacts: JSON.stringify([
        {
          label: 'Layanan Tatap Muka Ruang BK (Mode Contoh)',
          value: 'Gedung A Lt. 2 • Jam Layanan Sekolah',
          note: 'Permintaan di aplikasi diterima pengelola sekolah (Superadmin) dan dikoordinasikan dengan Guru BK.',
        },
        {
          label: 'Layanan Sejiwa Kemenkes RI (Rujukan Eksternal)',
          value: '119 ext 8',
          note: 'Gunakan bila butuh bantuan darurat segera di luar jam sekolah.',
        },
      ]),
      guardian_consent_required: false,
      active_handler_configured: true,
    });

    const policyId = crypto.randomUUID();
    await trx('consent_policies').insert({
      id: policyId,
      school_id: schoolId,
      version: '1.1',
      title: 'Persetujuan Pengelolaan Data & Ruang Aman TENANGIN.ID',
      summary:
        'Catatan pribadi digunakan untuk membantu latihan regulasi emosimu. Catatan dapat diakses olehmu dan Superadmin pengelola sekolah; Guru BK hanya memantau metadata penggunaan sesuai penugasan.',
      full_policy_text:
        '1. Tujuan: Tenangin.id membantu siswa mengenali perasaan, berlatih menenangkan diri, mencatat pikiran, menyusun rencana belajar, dan mengirim permintaan bantuan sukarela.\n2. Hak Akses Data: Isi jurnal, refleksi, dan hasil pribadi dapat diakses oleh dirimu sendiri dan Superadmin berizin (tercatat dalam log audit). Guru BK hanya membaca metadata aktivitas (jenis aktivitas, waktu, dan status) serta ringkasan kelompok tersupresi (k >= 5), tanpa membaca isi catatan pribadimu.\n3. Sifat Sukarela & Batas Layanan: Semua aktivitas setelah persetujuan bersifat sukarela. Platform ini bukan layanan darurat 24 jam maupun alat diagnosis medis.\n4. Hak Kamu: Kamu dapat menarik persetujuan atau meminta penghapusan akun kapan saja melalui menu Pengaturan Akun.',
      data_access_notice:
        'Catatan dapat diakses olehmu dan Superadmin. BK hanya melihat aktivitas penggunaan.',
      effective_date: '2026-11-20',
      is_active: true,
    });

    const studentPassHash = await hashPassword('SiswaDemo!2026', isTest);
    const staffPassHash = await hashPassword('StafDemo!2026', isTest);

    const adminId = crypto.randomUUID();
    await trx('users').insert({
      id: adminId,
      school_id: schoolId,
      account_code: 'Admin-Root-01',
      login_email: 'superadmin@tenangin.id',
      display_name: 'Admin Sekolah (Superadmin)',
      role: 'superadmin',
      status: 'active',
      grade_group: null,
      password_hash: staffPassHash,
      password_changed_at: new Date(),
      mfa_enabled: true,
      mfa_secret_encrypted: encryptSensitiveText('KRSXG5CTMVRXEZLU', keyRing),
      mfa_recovery_hashes: JSON.stringify([hashToken('REC-ADMIN-01'), hashToken('REC-ADMIN-02')]),
    });

    const bkRaniId = crypto.randomUUID();
    const bkSuryaId = crypto.randomUUID();
    await trx('users').insert([
      {
        id: bkRaniId,
        school_id: schoolId,
        account_code: 'BK-Rani-01',
        login_email: 'rani.bk@sekolah.sch.id',
        display_name: 'Bu Rani, S.Pd. (Guru BK)',
        role: 'bk',
        status: 'active',
        grade_group: null,
        password_hash: staffPassHash,
        password_changed_at: new Date(),
        mfa_enabled: true,
        mfa_secret_encrypted: encryptSensitiveText('JBSWY3DPEHPK3PXP', keyRing),
        mfa_recovery_hashes: JSON.stringify([hashToken('REC-BK-RANI-01')]),
      },
      {
        id: bkSuryaId,
        school_id: schoolId,
        account_code: 'BK-Surya-02',
        login_email: 'surya.bk@sekolah.sch.id',
        display_name: 'Pak Surya, M.Psi. (Guru BK)',
        role: 'bk',
        status: 'active',
        grade_group: null,
        password_hash: staffPassHash,
        password_changed_at: new Date(),
        mfa_enabled: true,
        mfa_secret_encrypted: encryptSensitiveText('NB2W45DFOIZA====', keyRing),
        mfa_recovery_hashes: JSON.stringify([hashToken('REC-BK-SURYA-02')]),
      },
    ]);

    await trx('counselor_assignments').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        counselor_user_id: bkRaniId,
        grade_group: 'Kelas X',
        period_label: 'Semester Ganjil 2026/2027',
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        counselor_user_id: bkRaniId,
        grade_group: 'Kelas XI',
        period_label: 'Semester Ganjil 2026/2027',
        is_active: true,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        counselor_user_id: bkSuryaId,
        grade_group: 'Kelas XII',
        period_label: 'Semester Ganjil 2026/2027',
        is_active: true,
      },
    ]);

    const studentSpecs = [
      {
        code: 'Awan-028',
        nisn: '0081234028',
        group: 'Kelas XI',
        status: 'active',
        consented: true,
      },
      {
        code: 'Awan-015',
        nisn: '0081234015',
        group: 'Kelas XI',
        status: 'active',
        consented: true,
      },
      {
        code: 'Awan-033',
        nisn: '0081234033',
        group: 'Kelas XI',
        status: 'active',
        consented: true,
      },
      {
        code: 'Awan-041',
        nisn: '0081234041',
        group: 'Kelas XI',
        status: 'active',
        consented: true,
      },
      {
        code: 'Awan-044',
        nisn: '0081234044',
        group: 'Kelas XI',
        status: 'active',
        consented: true,
      },
      {
        code: 'Awan-052',
        nisn: '0081234052',
        group: 'Kelas XI',
        status: 'active',
        consented: true,
      },
      { code: 'Awan-009', nisn: '0081234009', group: 'Kelas X', status: 'active', consented: true },
      {
        code: 'Bintang-014',
        nisn: '0081234014',
        group: 'Kelas X',
        status: 'active',
        consented: false,
      },
      {
        code: 'Awan-088',
        nisn: '0081234088',
        group: 'Kelas X',
        status: 'pending_activation',
        consented: false,
      },
      {
        code: 'Senja-099',
        nisn: '0081234099',
        group: 'Kelas XII',
        status: 'active',
        consented: true,
      },
    ];

    const studentIds = {};
    for (const spec of studentSpecs) {
      const uid = crypto.randomUUID();
      studentIds[spec.code] = uid;
      await trx('users').insert({
        id: uid,
        school_id: schoolId,
        account_code: spec.code,
        nisn: spec.nisn || null,
        login_email: null,
        display_name: spec.code,
        role: 'student',
        status: spec.status,
        grade_group: spec.group,
        password_hash: spec.status === 'active' ? studentPassHash : null,
        password_changed_at: spec.status === 'active' ? new Date() : null,
        mfa_enabled: false,
      });

      if (spec.consented) {
        await trx('consents').insert({
          id: crypto.randomUUID(),
          school_id: schoolId,
          user_id: uid,
          policy_id: policyId,
          policy_version: '1.1',
          status: 'accepted',
          scope: JSON.stringify({ personal_activities: true, group_aggregate: true }),
          guardian_verified: true,
          accepted_at: new Date(),
        });
      }

      await trx('reminder_preferences').insert({
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: uid,
        enabled: false,
        reminder_type: 'jeda_belajar',
        days_of_week: JSON.stringify([1, 2, 3, 4, 5]),
        preferred_time: '16:00',
        timezone: tz,
        quiet_hours_start: '21:30',
        quiet_hours_end: '06:00',
      });
    }

    // Token aktivasi sekali pakai untuk Awan-088
    await trx('account_tokens').insert({
      id: crypto.randomUUID(),
      user_id: studentIds['Awan-088'],
      school_id: schoolId,
      purpose: 'activation',
      token_hash: hashToken('AKTIVASI-DEMO-088'),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      issued_by_user_id: adminId,
    });

    // Latihan F4 (3 published + 1 draft)
    const breathingId = crypto.randomUUID();
    const muscleId = crypto.randomUUID();
    const mindfulnessId = crypto.randomUUID();
    await trx('exercise_contents').insert([
      {
        id: breathingId,
        school_id: schoolId,
        slug: 'latihan-napas-terpandu',
        category: 'breathing',
        title: 'Latihan Napas Terpandu (Contoh 4-4-4)',
        subtitle: '3 Menit • Fokus & Ketenangan',
        duration_seconds: 180,
        version: 1,
        status: 'published',
        instructions: JSON.stringify([
          {
            phase: 'Tarik Napas',
            seconds: 4,
            quote: 'Tarik napas perlahan lewat hidung... rasakan udara sejuk masuk.',
            detail: 'Letakkan satu tangan di perut agar terasa mengembang lembut.',
          },
          {
            phase: 'Tahan Sejenak',
            seconds: 4,
            quote: 'Tahan hening sejenak... biarkan bahu tetap rileks.',
            detail: 'Tidak perlu memaksa jika terasa sesak; kurangi hitungan kapan saja.',
          },
          {
            phase: 'Hembuskan',
            seconds: 4,
            quote: 'Hembuskan perlahan lewat mulut... lepaskan ketegangan.',
            detail: 'Kendurkan rahang dan biarkan bahu turun alami.',
          },
        ]),
        stop_notice:
          'Berhenti selalu diperbolehkan jika pusing atau tidak nyaman. Kamu bisa kembali kapan pun.',
        audio_url: '/audio/napas-terpandu-4-4-4.wav',
        source_reference: 'Materi Contoh Proposal TENANGIN.ID (Menunggu Tinjauan Ahli BK)',
        media_rights:
          'Audio & Ilustrasi Internal TENANGIN.ID (Sintesis Orisinal Proyek, Bebas Hak Cipta Pihak Ketiga)',
        reviewer_ref: 'Mode Contoh / Draf Kurasi',
      },
      {
        id: muscleId,
        school_id: schoolId,
        slug: 'relaksasi-otot-progresif',
        category: 'muscle_relaxation',
        title: 'Relaksasi Otot Progresif',
        subtitle: '4 Menit • Melepas Ketegangan Fisik',
        duration_seconds: 240,
        version: 1,
        status: 'published',
        instructions: JSON.stringify([
          {
            phase: 'Kencangkan Lembut',
            seconds: 5,
            quote: 'Angkat kedua bahu perlahan ke arah telinga secukupnya...',
            detail: 'Rasakan sensasi tegang ringan tanpa menahan napas.',
          },
          {
            phase: 'Amati Sebentar',
            seconds: 3,
            quote: 'Sadari perbedaan otot saat bekerja aktif...',
            detail: 'Jika ada nyeri pada bagian tubuh tertentu, lewati bagian tersebut.',
          },
          {
            phase: 'Lepaskan Bebas',
            seconds: 6,
            quote: 'Jatuhkan kedua bahu dan lemaskan jari-jari tangan...',
            detail: 'Nikmati rasa hangat dan ringan saat otot kembali kendur.',
          },
        ]),
        stop_notice: 'Jika muncul rasa tidak nyaman fisik, hentikan latihan secara perlahan.',
        audio_url: '/audio/relaksasi-otot-progresif.wav',
        source_reference: 'Adaptasi Panduan Relaksasi Otot Ringan (Contoh)',
        media_rights:
          'Audio & Ilustrasi Internal TENANGIN.ID (Sintesis Orisinal Proyek, Bebas Hak Cipta Pihak Ketiga)',
        reviewer_ref: 'Mode Contoh / Draf Kurasi',
      },
      {
        id: mindfulnessId,
        school_id: schoolId,
        slug: 'mindfulness-jeda-sejenak',
        category: 'mindfulness',
        title: 'Mindfulness Jeda Sejenak',
        subtitle: '5 Menit • Grounding & Sadar Penuh',
        duration_seconds: 300,
        version: 1,
        status: 'published',
        instructions: JSON.stringify([
          {
            phase: 'Amati Sekitar',
            seconds: 6,
            quote: 'Sebutkan dalam hati 3 benda yang terlihat di depanmu...',
            detail: 'Perhatikan warna dan bentuknya tanpa menilai baik atau buruk.',
          },
          {
            phase: 'Sadari Suara',
            seconds: 6,
            quote: 'Dengarkan 2 suara paling halus di ruangan saat ini...',
            detail: 'Biarkan pikiran lain lewat seperti awan tanpa harus dikejar.',
          },
          {
            phase: 'Rasakan Pijakan',
            seconds: 6,
            quote: 'Rasakan telapak kaki menyentuh lantai dan napasmu saat ini...',
            detail: 'Kamu berada di momen sekarang dan boleh melangkah pelan-pelan.',
          },
        ]),
        stop_notice:
          'Kamu memegang kendali penuh dan dapat berhenti kapan saja tanpa dinilai gagal.',
        audio_url: '/audio/mindfulness-5-4-3-2-1.wav',
        source_reference: 'Panduan Grounding 5-4-3-2-1 (Contoh)',
        media_rights:
          'Audio & Ilustrasi Internal TENANGIN.ID (Sintesis Orisinal Proyek, Bebas Hak Cipta Pihak Ketiga)',
        reviewer_ref: 'Mode Contoh / Draf Kurasi',
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'latihan-body-scan-draf',
        category: 'mindfulness',
        title: 'Draf Body Scan (Belum Terbit)',
        subtitle: '5 Menit • Draf Internal',
        duration_seconds: 300,
        version: 1,
        status: 'draft',
        instructions: JSON.stringify([
          { phase: 'Draf', seconds: 5, quote: 'Belum ditinjau.', detail: '' },
        ]),
        stop_notice: 'Berhenti kapan saja.',
        audio_url: null,
        source_reference: 'Draf Internal',
        media_rights: 'Internal',
        reviewer_ref: null,
      },
    ]);

    // 6 Artikel Pustaka F8 + 1 Draf tertutup
    const now = new Date();
    await trx('articles').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'memahami-stres-belajar-tanpa-menyalahkan-diri',
        topic: 'Stres Akademik',
        title: 'Kenapa tubuh kita tegang saat menghadapi ujian atau tumpukan tugas?',
        summary:
          'Memahami respons alami tubuh saat beban belajar meningkat serta langkah jeda realistis.',
        body: 'Saat menghadapi ujian atau tenggat tugas, sistem kewaspadaan otak membantu kita bersiap menghadapi tantangan. Detak jantung yang lebih cepat atau bahu yang terasa kaku adalah sinyal tubuh bahwa kita sedang membutuhkan jeda, bukan tanda kelemahan.\n\nLangkah sederhana: kenali sinyal fisikmu lebih awal, tarik napas teratur 3 menit, lalu pecah satu tugas besar menjadi satu bagian kecil yang bisa selesai dalam 20 menit.',
        tags: JSON.stringify(['stres', 'ujian', 'fisik']),
        version: 1,
        status: 'published',
        source_reference: 'Materi Psikoedukasi Dasar BK (Mode Contoh)',
        media_rights: 'Konten Teks Internal Proyek',
        reviewer_ref: 'Bu Rani (Draf Pilot)',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'mengenali-sinyal-emosi-dan-teknik-5-4-3-2-1',
        topic: 'Regulasi Emosi',
        title: 'Teknik 5-4-3-2-1 saat pikiran mulai penuh dan cemas',
        summary: 'Latihan grounding sensorik singkat untuk mengembalikan perhatian ke saat ini.',
        body: 'Ketika pikiran terasa penuh oleh kekhawatiran tentang nilai atau hari esok, perhatian kita sering terbawa ke masa depan. Teknik 5-4-3-2-1 mengajakmu memperhatikan 5 hal yang dilihat, 4 hal yang dapat disentuh, 3 suara yang didengar, 2 aroma yang tercium, dan 1 napas tenang di saat ini.',
        tags: JSON.stringify(['emosi', 'cemas', 'grounding']),
        version: 1,
        status: 'published',
        source_reference: 'Panduan Keterampilan Grounding Remaja (Mode Contoh)',
        media_rights: 'Konten Teks Internal Proyek',
        reviewer_ref: 'Bu Rani (Draf Pilot)',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'menemukan-alternatif-pikiran-yang-lebih-realistis',
        topic: 'Pikiran Realistis',
        title: 'Melihat ulang pikiran berat dengan sudut pandang yang lebih realistis',
        summary:
          'Cara berlatih melihat situasi belajar secara seimbang tanpa memaksa harus selalu positif.',
        body: 'Saat lelah, pikiran otomatis sering menyimpulkan hal terburuk seperti "semua tugas pasti gagal". Alternatif realistis tidak berarti memaksa diri tersenyum, melainkan mencari fakta yang lebih adil: "Bagian ini memang sulit, tapi aku sudah menyelesaikan langkah pertama dan bisa bertanya jika masih bingung."',
        tags: JSON.stringify(['jurnal', 'pikiran', 'cbt']),
        version: 1,
        status: 'published',
        source_reference: 'Pengantar Restrukturisasi Kognitif Ringan (Mode Contoh)',
        media_rights: 'Konten Teks Internal Proyek',
        reviewer_ref: 'Bu Rani (Draf Pilot)',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'memecah-beban-belajar-menjadi-langkah-kecil',
        topic: 'Beban Belajar',
        title: 'Cara memecah tumpukan tugas sekolah menjadi langkah kecil yang terukur',
        summary: 'Menggunakan prioritas penting/mendesak agar rencana harian terasa lebih ringan.',
        body: 'Melihat lima tugas sekaligus membuat otak enggan memulai. Coba pilih satu tugas yang paling penting atau dekat tenggatnya, lalu tuliskan langkah pertama yang berdurasi 15-25 menit. Jadwalkan blok istirahat singkat di antaranya agar energi tidak habis sekaligus.',
        tags: JSON.stringify(['rencana', 'tugas', 'prioritas']),
        version: 1,
        status: 'published',
        source_reference: 'Panduan Manajemen Beban Belajar SMA (Mode Contoh)',
        media_rights: 'Konten Teks Internal Proyek',
        reviewer_ref: 'Bu Rani (Draf Pilot)',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'menjaga-istirahat-dan-tidur-di-tengah-tugas',
        topic: 'Istirahat & Tidur',
        title: 'Menjaga kualitas tidur dan jeda istirahat meski tugas sekolah menumpuk',
        summary:
          'Mengatur batas layar malam dan blok istirahat pribadi untuk menjaga daya ingat belajar.',
        body: 'Belajar tanpa jeda hingga larut malam justru membuat konsentrasi menurun keesokan harinya. Sisipkan blok istirahat 15 menit tanpa gawai setelah sesi belajar dan tentukan jam tenang malam hari sesuai ritme sekolahmu.',
        tags: JSON.stringify(['tidur', 'istirahat', 'jam tenang']),
        version: 1,
        status: 'published',
        source_reference: 'Edukasi Kebersihan Tidur Remaja (Mode Contoh)',
        media_rights: 'Konten Teks Internal Proyek',
        reviewer_ref: 'Bu Rani (Draf Pilot)',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'kapan-dan-bagaimana-meminta-bantuan-manusia',
        topic: 'Mencari Bantuan',
        title: 'Kapan perlu berbicara dengan Guru BK atau orang dewasa tepercaya?',
        summary:
          'Mengenal batas layanan mandiri aplikasi serta cara mengajukan bantuan tatap muka di sekolah.',
        body: 'Aplikasi mandiri membantu latihan harian, namun percakapan tatap muka dengan Guru BK atau orang dewasa tepercaya tetap penting ketika beban terasa berlangsung terus-menerus atau mengganggu aktivitas harianmu. Gunakan tombol "Butuh bicara?" untuk melihat jam layanan resmi dan mengirim permintaan sukarela.',
        tags: JSON.stringify(['bantuan', 'bk', 'konseling']),
        version: 1,
        status: 'published',
        source_reference: 'Prosedur Layanan Bantuan BK Sekolah (Mode Contoh)',
        media_rights: 'Konten Teks Internal Proyek',
        reviewer_ref: 'Bu Rani (Draf Pilot)',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        slug: 'draf-artikel-belum-terbit',
        topic: 'Internal',
        title: 'Draf Artikel yang Belum Diterbitkan',
        summary: 'Artikel ini berstatus draft dan tidak boleh terbuka di halaman publik.',
        body: 'Konten draf internal.',
        tags: JSON.stringify(['draf']),
        version: 1,
        status: 'draft',
        source_reference: 'Draf Internal',
        media_rights: 'Internal',
        reviewer_ref: null,
        published_at: null,
      },
    ]);

    // Skrining simulasi berlabel
    await trx('screening_instruments').insert({
      id: crypto.randomUUID(),
      school_id: schoolId,
      code: SIMULATION_SCREENING_FIXTURE.code,
      version: SIMULATION_SCREENING_FIXTURE.version,
      title: SIMULATION_SCREENING_FIXTURE.title,
      description: SIMULATION_SCREENING_FIXTURE.description,
      reference_period: SIMULATION_SCREENING_FIXTURE.reference_period,
      is_simulation: true,
      is_approved: false,
      approval_ref: null,
      status: 'active',
      items: JSON.stringify(SIMULATION_SCREENING_FIXTURE.items),
      scoring_rules: JSON.stringify(SIMULATION_SCREENING_FIXTURE.scoring_rules),
    });

    // Data aktivitas pribadi demo untuk Awan-028
    const awanId = studentIds['Awan-028'];
    await trx('mood_entries').insert({
      id: crypto.randomUUID(),
      school_id: schoolId,
      user_id: awanId,
      local_date: todayStr,
      school_timezone: tz,
      mood_code: 'calm_relieved',
      mood_label: 'Tenang / Lega',
      mood_score: 4,
      pressure_level: 4,
      skipped: false,
    });

    await trx('journal_entries').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: awanId,
        situation_encrypted: encryptSensitiveText(
          'Tugas proyek Biologi dikumpulkan lusa dan pembagian slide kelompok baru selesai sebagian.',
          keyRing
        ),
        thoughts_encrypted: encryptSensitiveText(
          'Takut penjelasanku besok kurang rapi dan membuat kelompok terhambat.',
          keyRing
        ),
        feelings_encrypted: encryptSensitiveText('Gelisah, bahu sedikit tegang', keyRing),
        emotion_tags: JSON.stringify(['Gelisah', 'Beban berat']),
        alternative_encrypted: encryptSensitiveText(
          'Aku sudah mencicil 3 slide dan masih bisa berkoordinasi 20 menit sepulang sekolah.',
          keyRing
        ),
        version: 1,
        local_date: todayStr,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: awanId,
        situation_encrypted: encryptSensitiveText(
          'Menerima nilai ulangan harian Matematika Bab Trigonometri di bawah target.',
          keyRing
        ),
        thoughts_encrypted: encryptSensitiveText(
          'Sempat merasa tertinggal dari teman sekelas.',
          keyRing
        ),
        feelings_encrypted: encryptSensitiveText(
          'Kecewa namun mulai lega setelah mengecek soalnya',
          keyRing
        ),
        emotion_tags: JSON.stringify(['Kelelahan']),
        alternative_encrypted: encryptSensitiveText(
          'Ini baru ulangan harian pertama, aku tahu bagian rumus mana yang perlu diulang.',
          keyRing
        ),
        version: 1,
        local_date: lastWeekStart,
      },
    ]);

    const task1Id = crypto.randomUUID();
    const task2Id = crypto.randomUUID();
    await trx('tasks').insert([
      {
        id: task1Id,
        school_id: schoolId,
        user_id: awanId,
        title: 'Pecah ringkasan Fisika Bab 4 menjadi 2 sub-bab',
        notes: 'Fokus rumus gerak & latihan 3 soal.',
        target_date: todayStr,
        estimated_minutes: 25,
        is_important: true,
        is_urgent: false,
        status: 'pending',
      },
      {
        id: task2Id,
        school_id: schoolId,
        user_id: awanId,
        title: 'Latihan 5 soal Kimia Asam-Basa',
        notes: null,
        target_date: null,
        estimated_minutes: 20,
        is_important: false,
        is_urgent: false,
        status: 'pending',
      },
    ]);
    await trx('task_steps').insert([
      {
        id: crypto.randomUUID(),
        task_id: task1Id,
        user_id: awanId,
        title: 'Baca ulang 2 halaman rangkuman konsep',
        sort_order: 1,
        is_done: true,
      },
      {
        id: crypto.randomUUID(),
        task_id: task1Id,
        user_id: awanId,
        title: 'Kerjakan soal contoh nomor 1-3',
        sort_order: 2,
        is_done: false,
      },
    ]);

    await trx('schedule_blocks').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: awanId,
        block_type: 'rest',
        title: 'Jeda tanpa layar setelah belajar sore',
        local_date: todayStr,
        start_time: '16:30',
        end_time: '16:45',
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: awanId,
        block_type: 'sleep',
        title: 'Persiapan tidur malam',
        local_date: todayStr,
        start_time: '21:45',
        end_time: '05:30',
      },
    ]);

    await trx('weekly_reflections').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: awanId,
        week_start: lastWeekStart,
        week_end: lastWeekEnd,
        school_timezone: tz,
        helpful_encrypted: encryptSensitiveText(
          'Latihan napas 3 menit sebelum belajar membantu pikiran lebih tenang.',
          keyRing
        ),
        obstacle_encrypted: encryptSensitiveText(
          'Masih sering membuka ponsel saat larut malam sehingga agak mengantuk.',
          keyRing
        ),
        plan_encrypted: encryptSensitiveText(
          'Menaruh ponsel di luar jangkauan meja belajar pukul 21.30 WIB.',
          keyRing
        ),
        strategy_tags: JSON.stringify(['Latihan napas teratur', 'Membatasi layar malam']),
        version: 1,
      },
    ]);

    // Aktivitas lintas siswa Kelas XI di minggu sebelumnya (6 siswa >= k=5) dan Kelas X (1 siswa < k=5)
    const kelasXICodes = ['Awan-028', 'Awan-015', 'Awan-033', 'Awan-041', 'Awan-044', 'Awan-052'];
    for (let idx = 0; idx < kelasXICodes.length; idx++) {
      const code = kelasXICodes[idx];
      const uid = studentIds[code];
      await trx('mood_entries')
        .insert({
          id: crypto.randomUUID(),
          school_id: schoolId,
          user_id: uid,
          local_date: lastWeekStart,
          school_timezone: tz,
          mood_code: idx % 2 === 0 ? 'calm_relieved' : 'neutral',
          mood_label: idx % 2 === 0 ? 'Tenang / Lega' : 'Biasa Saja',
          mood_score: idx % 2 === 0 ? 4 : 3,
          pressure_level: 4,
          skipped: false,
        })
        .onConflict(['user_id', 'local_date'])
        .ignore();

      await trx('exercise_sessions').insert({
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: uid,
        exercise_id: breathingId,
        exercise_version: 1,
        status: 'completed',
        active_seconds: 180,
        started_at: new Date(`${lastWeekStart}T09:00:00+07:00`),
        ended_at: new Date(`${lastWeekStart}T09:03:00+07:00`),
        local_date: lastWeekStart,
      });

      if (code !== 'Awan-028') {
        await trx('weekly_reflections').insert({
          id: crypto.randomUUID(),
          school_id: schoolId,
          user_id: uid,
          week_start: lastWeekStart,
          week_end: lastWeekEnd,
          school_timezone: tz,
          helpful_encrypted: encryptSensitiveText(
            'Membuat jadwal jeda singkat antar tugas.',
            keyRing
          ),
          obstacle_encrypted: encryptSensitiveText('Waktu sore cukup padat.', keyRing),
          plan_encrypted: encryptSensitiveText('Menyiapkan prioritas sebelum belajar.', keyRing),
          strategy_tags: JSON.stringify(['Membuat jadwal jeda', 'Latihan napas teratur']),
          version: 1,
        });
      }

      await trx('activity_metadata_events').insert([
        {
          id: crypto.randomUUID(),
          school_id: schoolId,
          user_id: uid,
          grade_group: 'Kelas XI',
          activity_type: 'exercise',
          activity_label: 'Latihan Napas Terpandu',
          status_label: 'Selesai',
          duration_seconds: 180,
          local_date: lastWeekStart,
          occurred_at: new Date(`${lastWeekStart}T09:03:00+07:00`),
        },
        {
          id: crypto.randomUUID(),
          school_id: schoolId,
          user_id: uid,
          grade_group: 'Kelas XI',
          activity_type: 'mood',
          activity_label: 'Cek Suasana Hati Harian',
          status_label: 'Tersimpan',
          duration_seconds: null,
          local_date: todayStr,
          occurred_at: new Date(),
        },
      ]);
    }

    // 1 aktivitas untuk Kelas X (agar k=1 < 5 teruji tersupresi) dan 1 untuk Kelas XII (di luar scope Bu Rani)
    await trx('activity_metadata_events').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: studentIds['Awan-009'],
        grade_group: 'Kelas X',
        activity_type: 'reflection',
        activity_label: 'Refleksi Mingguan',
        status_label: 'Tersimpan',
        duration_seconds: null,
        local_date: lastWeekStart,
        occurred_at: new Date(`${lastWeekStart}T14:20:00+07:00`),
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        user_id: studentIds['Senja-099'],
        grade_group: 'Kelas XII',
        activity_type: 'journal',
        activity_label: 'Jurnal Pemicu & Pikiran',
        status_label: 'Tersimpan',
        duration_seconds: null,
        local_date: todayStr,
        occurred_at: new Date(),
      },
    ]);

    // Permintaan bantuan demo (dikelola Superadmin)
    const help1Id = crypto.randomUUID();
    const help2Id = crypto.randomUUID();
    const help3Id = crypto.randomUUID();

    await trx('help_requests').insert([
      {
        id: help1Id,
        school_id: schoolId,
        student_user_id: awanId,
        handler_user_id: adminId,
        requested_counselor: 'Bu Rani, S.Pd. (Guru BK Kelas XI)',
        preferred_time: 'Istirahat 2 (12:30 - 13:15 WIB)',
        topic_message_encrypted: encryptSensitiveText(
          'Ingin berdiskusi soal cara membagi waktu belajar menjelang ujian bab.',
          keyRing
        ),
        contact_encrypted: encryptSensitiveText('awan028@contoh.sch.id', keyRing),
        status: 'acknowledged',
        idempotency_key: 'demo-help-awan-028-1',
      },
      {
        id: help2Id,
        school_id: schoolId,
        student_user_id: studentIds['Awan-041'],
        handler_user_id: null,
        requested_counselor: 'Bu Rani, S.Pd. (Guru BK Kelas XI)',
        preferred_time: 'Istirahat 1 (10:00 - 10:30 WIB)',
        topic_message_encrypted: encryptSensitiveText(
          'Merasa cukup kewalahan dengan tugas kelompok minggu ini.',
          keyRing
        ),
        contact_encrypted: null,
        status: 'submitted',
        idempotency_key: 'demo-help-awan-041-1',
      },
      {
        id: help3Id,
        school_id: schoolId,
        student_user_id: studentIds['Senja-099'],
        handler_user_id: null,
        requested_counselor: 'Pak Surya, M.Psi. (Guru BK Kelas XII)',
        preferred_time: 'Pulang Sekolah (15:00 WIB)',
        topic_message_encrypted: encryptSensitiveText(
          'Ingin konsultasi persiapan ujian akhir.',
          keyRing
        ),
        contact_encrypted: null,
        status: 'submitted',
        idempotency_key: 'demo-help-senja-099-1',
      },
    ]);

    await trx('help_status_events').insert([
      {
        id: crypto.randomUUID(),
        help_request_id: help1Id,
        actor_user_id: awanId,
        actor_role: 'student',
        from_status: null,
        to_status: 'submitted',
        note: 'Permintaan bantuan dikirim siswa.',
      },
      {
        id: crypto.randomUUID(),
        help_request_id: help1Id,
        actor_user_id: adminId,
        actor_role: 'superadmin',
        from_status: 'submitted',
        to_status: 'acknowledged',
        note: 'Diterima pengelola sekolah untuk dikoordinasikan ke ruang BK.',
      },
      {
        id: crypto.randomUUID(),
        help_request_id: help2Id,
        actor_user_id: studentIds['Awan-041'],
        actor_role: 'student',
        from_status: null,
        to_status: 'submitted',
        note: 'Permintaan bantuan dikirim siswa.',
      },
      {
        id: crypto.randomUUID(),
        help_request_id: help3Id,
        actor_user_id: studentIds['Senja-099'],
        actor_role: 'student',
        from_status: null,
        to_status: 'submitted',
        note: 'Permintaan bantuan dikirim siswa.',
      },
    ]);

    await trx('help_acknowledgements').insert({
      id: crypto.randomUUID(),
      help_request_id: help1Id,
      author_user_id: adminId,
      message:
        'Halo Awan-028, permintaanmu sudah diterima pengelola layanan dan diteruskan untuk jadwal konsultasi tatap muka bersama Bu Rani sesuai jam layanan BK.',
      location_info: 'Ruang BK Gedung A, Lantai 2',
      schedule_info: 'Kamis, Istirahat Ke-2 (12:45 WIB)',
      version: 1,
      revision_history: JSON.stringify([]),
    });

    await trx('group_feedback').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        author_user_id: adminId,
        target_group: 'Semua Siswa',
        period_label: `Minggu ${currentWeekStart} s.d. ${currentWeekEnd}`,
        title: 'Pengingat Jeda Belajar Pekan Evaluasi',
        body: 'Saat tugas menumpuk, tetap sisihkan waktu istirahat singkat dan jaga jam tidur agar konsentrasi belajar tetap terjaga. Jika butuh diskusi tatap muka, silakan ajukan lewat halaman Bantuan.',
        status: 'published',
        published_at: now,
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        author_user_id: adminId,
        target_group: 'Kelas XI',
        period_label: `Minggu ${currentWeekStart} s.d. ${currentWeekEnd}`,
        title: 'Jadwal Layanan BK Kelas XI',
        body: 'Layanan tatap muka BK Kelas XI tersedia Senin-Jumat pukul 08:00-15:30 WIB di Gedung A Lt. 2.',
        status: 'published',
        published_at: now,
      },
    ]);

    await trx('governance_reviews').insert(buildGovernanceSeedRows(crypto, schoolId));

    await trx('audit_events').insert([
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        actor_user_id: adminId,
        actor_code: 'Admin-Root-01',
        actor_role: 'superadmin',
        action: 'help_request_acknowledged',
        target_type: 'help_request',
        target_id: help1Id,
        outcome: 'success',
        summary: 'Superadmin memberi respons administratif awal pada permintaan Awan-028.',
      },
      {
        id: crypto.randomUUID(),
        school_id: schoolId,
        actor_user_id: adminId,
        actor_code: 'Admin-Root-01',
        actor_role: 'superadmin',
        action: 'counselor_assignment_updated',
        target_type: 'counselor_assignment',
        target_id: bkRaniId,
        outcome: 'success',
        summary: 'Superadmin menetapkan cakupan pemantauan BK-Rani-01 untuk Kelas X dan Kelas XI.',
      },
    ]);
  });

  const school = await db('schools').where({ code: 'SMA-CONTOH-01' }).first();
  await computeWeeklySnapshots(db, school.id, lastWeekStart, tz);

  return {
    schoolId: school.id,
    lastWeekStart,
    currentWeekStart,
  };
}

const isCli = process.argv[1] && process.argv[1].endsWith('demo-seed.js');
if (isCli) {
  const env = loadEnv();
  const db = createDatabase(env.TEST_DATABASE_URL || env.DATABASE_URL);
  runDemoSeed(db, env)
    .then((res) => {
      console.log('Demo seed selesai:', res);
      return db.destroy();
    })
    .catch(async (err) => {
      console.error('Demo seed gagal:', err.message);
      await db.destroy();
      process.exit(1);
    });
}
