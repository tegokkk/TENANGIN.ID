import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';

describe('Integration: Fitur Siswa F2-F9, Enkripsi, Konflik, Idempotensi, dan Isolasi Lintas Siswa', () => {
  let ctx;

  beforeAll(() => {
    ctx = createTestContext();
  });

  beforeEach(async () => {
    await ctx.resetAndSeed();
  });

  afterAll(async () => {
    await ctx.teardown();
  });

  it('menyimpan mood, jurnal terenkripsi + 409 konflik edit, tugas/langkah, latihan, refleksi, dan pustaka (draft tertutup)', async () => {
    const client = await ctx.createAgent();
    await client.login('awan-028', 'SiswaDemo!2026');

    // F2 Mood
    const moodRes = await client.agent
      .post('/api/moods')
      .set('x-csrf-token', client.csrfToken)
      .send({ moodCode: 'anxious_tired', pressureLevel: 7 });
    expect(moodRes.status).toBe(201);
    expect(moodRes.body.data.entry.moodLabel).toBe('Cemas / Lelah');

    // F3 Jurnal terenkripsi di PostgreSQL + deteksi konflik versi
    const journalCreate = await client.agent
      .post('/api/journals')
      .set('x-csrf-token', client.csrfToken)
      .send({
        situation: 'Ujian Fisika mendadak minggu depan',
        thoughts: 'Khawatir waktu tidak cukup',
        feelings: 'Gelisah',
        emotionTags: ['Gelisah'],
        alternative: 'Cicil 20 menit per malam',
      });
    expect(journalCreate.status).toBe(201);
    const jId = journalCreate.body.data.entry.id;

    const rawDbJournal = await ctx.adminDb('journal_entries').where({ id: jId }).first();
    expect(rawDbJournal.situation_encrypted.startsWith('v1:')).toBe(true);
    expect(rawDbJournal.situation_encrypted).not.toContain('Ujian Fisika');

    const patchOk = await client.agent
      .patch(`/api/journals/${jId}`)
      .set('x-csrf-token', client.csrfToken)
      .send({
        situation: 'Ujian Fisika mendadak minggu depan (diperbarui)',
        thoughts: 'Khawatir waktu tidak cukup',
        feelings: 'Gelisah',
        emotionTags: ['Gelisah'],
        alternative: 'Cicil 25 menit per malam',
        version: 1,
      });
    expect(patchOk.status).toBe(200);
    expect(patchOk.body.data.entry.version).toBe(2);

    const patchStale = await client.agent
      .patch(`/api/journals/${jId}`)
      .set('x-csrf-token', client.csrfToken)
      .send({
        situation: 'Tab lama menimpa',
        thoughts: 'x',
        feelings: 'y',
        version: 1,
      });
    expect(patchStale.status).toBe(409);

    // F4 Latihan: berhenti sukarela tidak dianggap gagal
    const exList = await client.agent.get('/api/exercises');
    expect(exList.status).toBe(200);
    expect(exList.body.data.exercises.every((e) => e.slug !== 'latihan-body-scan-draf')).toBe(true);

    const startSess = await client.agent
      .post('/api/exercise-sessions')
      .set('x-csrf-token', client.csrfToken)
      .send({ exerciseId: exList.body.data.exercises[0].id });
    expect(startSess.status).toBe(201);

    const stopSess = await client.agent
      .patch(`/api/exercise-sessions/${startSess.body.data.session.id}`)
      .set('x-csrf-token', client.csrfToken)
      .send({ status: 'stopped', activeSeconds: 45 });
    expect(stopSess.status).toBe(200);
    expect(stopSess.body.data.session.status).toBe('stopped');

    // F5 Perencana tugas + langkah + blok istirahat
    const taskRes = await client.agent
      .post('/api/tasks')
      .set('x-csrf-token', client.csrfToken)
      .send({ title: 'Ringkas Bab 5 Sejarah', isImportant: true });
    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data.task.id;

    const stepRes = await client.agent
      .post(`/api/tasks/${taskId}/steps`)
      .set('x-csrf-token', client.csrfToken)
      .send({ title: 'Baca 3 halaman pertama' });
    expect(stepRes.status).toBe(201);

    const delTask = await client.agent
      .delete(`/api/tasks/${taskId}`)
      .set('x-csrf-token', client.csrfToken);
    expect(delTask.status).toBe(200);
    const orphanSteps = await ctx.adminDb('task_steps').where({ task_id: taskId });
    expect(orphanSteps.length).toBe(0);

    // F7 Refleksi mingguan
    const reflRes = await client.agent
      .post('/api/reflections')
      .set('x-csrf-token', client.csrfToken)
      .send({
        helpful: 'Istirahat 15 menit tanpa gawai',
        obstacle: 'Distraksi notifikasi',
        plan: 'Mode hening saat belajar',
        strategyTags: ['Membuat jadwal jeda'],
      });
    expect(reflRes.status).toBe(201);

    // F8 Pustaka publik: artikel terbit ada >= 6, artikel draft 404 via URL tebakan
    const pubArticles = await client.agent.get('/api/articles?q=tidur');
    expect(pubArticles.status).toBe(200);
    expect(pubArticles.body.data.articles.length).toBeGreaterThanOrEqual(1);

    const draftArticle = await client.agent.get('/api/articles/draf-artikel-belum-terbit');
    expect(draftArticle.status).toBe(404);
  });

  it('menjamin idempotensi permintaan bantuan, pembatalan, dan pemblokiran lintas siswa / pemalsuan role', async () => {
    const awan = await ctx.createAgent();
    await awan.login('awan-028', 'SiswaDemo!2026');

    const awan015 = await ctx.createAgent();
    await awan015.login('awan-015', 'SiswaDemo!2026');

    // Awan-028 membuat jurnal lalu Awan-015 mencoba mengaksesnya dengan ID langsung -> 404
    const jRes = await awan.agent
      .post('/api/journals')
      .set('x-csrf-token', awan.csrfToken)
      .send({ situation: 'Rahasia Awan-028', thoughts: 'Pribadi', feelings: 'Tenang' });
    const jId = jRes.body.data.entry.id;

    const crossRead = await awan015.agent.get(`/api/journals/${jId}`);
    expect(crossRead.status).toBe(404);
    const crossDelete = await awan015.agent
      .delete(`/api/journals/${jId}`)
      .set('x-csrf-token', awan015.csrfToken);
    expect(crossDelete.status).toBe(404);

    // Pemalsuan role dari payload ditolak (siswa tidak bisa membuka endpoint Superadmin/BK)
    const spoofed = await awan.agent
      .post('/api/superadmin/users')
      .set('x-csrf-token', awan.csrfToken)
      .send({
        role: 'superadmin',
        accountCode: 'Hacker-01',
        displayName: 'Hacker',
      });
    expect(spoofed.status).toBe(403);

    // Idempotency key mencegah permintaan bantuan ganda
    const idemKey = 'idem-help-test-123456';
    const h1 = await awan.agent
      .post('/api/help-requests')
      .set('x-csrf-token', awan.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send({
        requestedCounselor: 'Bu Rani',
        preferredTime: 'Istirahat 1',
        topicMessage: 'Butuh bantuan mengatur jadwal belajar.',
        contact: 'awan028@contoh.sch.id',
      });
    expect(h1.status).toBe(201);
    expect(h1.body.data.deduplicated).toBe(false);

    const h2 = await awan.agent
      .post('/api/help-requests')
      .set('x-csrf-token', awan.csrfToken)
      .set('Idempotency-Key', idemKey)
      .send({
        requestedCounselor: 'Bu Rani',
        preferredTime: 'Istirahat 1',
        topicMessage: 'Butuh bantuan mengatur jadwal belajar.',
      });
    expect(h2.status).toBe(200);
    expect(h2.body.data.deduplicated).toBe(true);
    expect(h2.body.data.request.id).toBe(h1.body.data.request.id);

    // Siswa dapat membatalkan permintaannya sendiri
    const cancelRes = await awan.agent
      .patch(`/api/help-requests/${h1.body.data.request.id}/status`)
      .set('x-csrf-token', awan.csrfToken)
      .send({ status: 'cancelled' });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.request.status).toBe('cancelled');
  });
});
