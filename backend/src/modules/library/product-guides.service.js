import crypto from 'node:crypto';

// Original product instructions, not fixture data, clinical instruments, or expert endorsements.
export async function installProductGuides(db, schoolId) {
  const common = {
    school_id: schoolId,
    version: 1,
    status: 'published',
    source_reference: 'Panduan penggunaan bawaan TENANGIN.ID',
    media_rights: 'Teks asli panduan produk TENANGIN.ID',
    reviewer_ref: null,
  };
  const exercises = await db('exercise_contents')
    .insert({
      ...common,
      id: crypto.randomUUID(),
      slug: 'jeda-belajar-mandiri',
      category: 'mindfulness',
      title: 'Jeda Belajar',
      subtitle: 'Jeda mandiri · 3 menit',
      duration_seconds: 180,
      instructions: JSON.stringify([
        {
          phase: 'Mulai Jeda',
          seconds: 30,
          quote: 'Letakkan pekerjaanmu sejenak.',
          detail: 'Pilih posisi yang nyaman. Tidak ada target yang harus dicapai selama jeda.',
        },
        {
          phase: 'Perhatikan Sekitar',
          seconds: 30,
          quote: 'Lihat benda-benda di sekitarmu.',
          detail: 'Kamu boleh melihat satu benda yang menarik perhatianmu.',
        },
        {
          phase: 'Beri Ruang',
          seconds: 30,
          quote: 'Biarkan dirimu beristirahat sebentar.',
          detail: 'Bernapas seperti biasa. Kamu tidak perlu mengikuti hitungan napas.',
        },
        {
          phase: 'Lanjutkan Jeda',
          seconds: 30,
          quote: 'Tetaplah dalam posisi yang terasa nyaman.',
          detail: 'Kamu boleh mengubah posisi atau mengakhiri jeda kapan saja.',
        },
        {
          phase: 'Pilih Langkah Kecil',
          seconds: 30,
          quote: 'Pikirkan satu hal yang ingin kamu lakukan setelah ini.',
          detail:
            'Pilih langkah yang sederhana, atau lanjutkan beristirahat jika kamu membutuhkannya.',
        },
        {
          phase: 'Akhiri Saat Siap',
          seconds: 30,
          quote: 'Kembali ke kegiatanmu saat kamu siap.',
          detail:
            'Panduan ini adalah pengatur jeda belajar, bukan pemeriksaan atau penanganan medis.',
        },
      ]),
      stop_notice:
        'Kamu dapat menjeda atau berhenti kapan saja. Panduan ini hanya menemani jeda belajar.',
      audio_url: null,
    })
    .onConflict(['school_id', 'slug', 'version'])
    .ignore()
    .returning('id');
  const guides = [
    {
      slug: 'panduan-memulai-tugas',
      topic: 'Rencana Belajar',
      title: 'Mulai dari Satu Langkah',
      summary:
        'Gunakan perencana untuk mengubah pekerjaan besar menjadi langkah yang bisa kamu pilih satu per satu.',
      body: 'Tuliskan satu tugas di Beranda. Beri nama yang menjelaskan apa yang ingin kamu kerjakan. Jika sudah memiliki tenggat, isi tanggalnya; perkiraan durasi boleh kamu sesuaikan.\n\nBuka rincian tugas untuk menambahkan langkah-langkah kecil. Mulailah dari langkah yang paling mudah kamu tentukan. Tandai langkah yang selesai dan ubah rencana ketika keadaan berubah.\n\nGunakan penanda penting dan mendesak sesuai kebutuhanmu. Keduanya membantu mengatur tampilan tugas, bukan memberi nilai atas pekerjaanmu. Kamu dapat mengubah jadwal atau menghapus tugas yang tidak lagi diperlukan.',
      tags: ['perencana', 'tugas'],
    },
    {
      slug: 'panduan-mencatat',
      topic: 'Catatan Pribadi',
      title: 'Mengenal Menu Catat',
      summary: 'Panduan menggunakan kolom situasi, pikiran, dan perasaan pada catatan pribadimu.',
      body: 'Buka menu Catat. Kolom situasi dapat diisi dengan hal yang sedang kamu alami. Kolom pikiran berisi hal yang terlintas, sedangkan kolom perasaan dapat kamu tulis dengan bahasamu sendiri. Tulisan singkat pun boleh.\n\nPeriksa kembali sebelum menekan Simpan Jurnal. Setelah tersimpan, catatan dapat dibuka kembali, diperbarui, atau dihapus. Jika koneksi terputus, pertahankan halaman tetap terbuka sampai penyimpanan berhasil.\n\nIsi catatan dapat dibaca olehmu dan Superadmin dengan pencatatan audit. Guru BK hanya melihat metadata aktivitas sesuai penugasan. Gunakan pengaturan akun untuk mengelola atau menghapus datamu.',
      tags: ['catatan', 'panduan'],
    },
    {
      slug: 'panduan-jeda-dan-refleksi',
      topic: 'Penggunaan Aplikasi',
      title: 'Jeda dan Refleksi Sesuai Kebutuhanmu',
      summary:
        'Kenali pengatur jeda, jadwal istirahat, dan refleksi mingguan yang tersedia di aplikasi.',
      body: 'Menu Tenang menyediakan panduan jeda dengan pengatur waktu. Tekan Mulai Latihan untuk menjalankannya. Kamu dapat menjeda, melanjutkan, atau berhenti kapan saja. Panduan berjalan dengan teks tanpa suara otomatis.\n\nDi Beranda, tambahkan blok istirahat pada jadwalmu. Pengingat di dalam aplikasi dapat diaktifkan sesuai hari dan waktu yang kamu pilih. Notifikasi perangkat memerlukan izin browser serta dukungan perangkat.\n\nMenu Refleksi menyediakan ruang untuk menulis apa yang membantu, hambatan yang kamu temui, dan rencana kecil berikutnya. Semua kegiatan ini bersifat sukarela. Aplikasi ini bukan alat diagnosis dan tidak menjanjikan hasil kesehatan tertentu.',
      tags: ['jeda', 'refleksi'],
    },
  ];
  const articles = await db('articles')
    .insert(
      guides.map((guide) => ({
        ...common,
        ...guide,
        id: crypto.randomUUID(),
        tags: JSON.stringify(guide.tags),
        published_at: new Date(),
      }))
    )
    .onConflict(['school_id', 'slug', 'version'])
    .ignore()
    .returning('id');
  return { exercisesCreated: exercises.length, articlesCreated: articles.length };
}
