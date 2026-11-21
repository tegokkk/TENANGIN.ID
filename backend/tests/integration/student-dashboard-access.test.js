import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';
import { purgeDummyDatabase } from '../../scripts/purge-demo-data.mjs';
import { provisionFirstAdmin } from '../../scripts/bootstrap-admin.js';
import { installProductGuides } from '../../src/modules/library/product-guides.service.js';
import { eligibleStudentIds } from '../../src/policies/consent-eligibility.policy.js';

describe('Dashboard siswa pada konfigurasi bersih dengan persetujuan akun', () => {
  let ctx;
  let operator;
  let student;
  let user;
  let schoolId;
  beforeAll(() => {
    ctx = createTestContext();
  });
  beforeEach(async () => {
    await ctx.resetAndSeed();
    const database = new URL(ctx.env.TEST_DATABASE_URL).pathname.slice(1);
    await purgeDummyDatabase(ctx.adminDb, { expectedDatabase: database, apply: true });
    const provisioned = await provisionFirstAdmin({
      db: ctx.adminDb,
      env: ctx.env,
      settings: {
        schoolCode: 'SMA-CONTOH-01',
        schoolName: 'Pengujian Fitur Terisolasi',
        adminEmail: 'operator@example.test',
        adminPassword: 'PengelolaPengujian!2026',
      },
    });
    schoolId = provisioned.schoolId;
    student = await ctx.createAgent();
    const registered = await student.agent
      .post('/api/auth/register')
      .set('x-csrf-token', student.csrfToken)
      .send({
        displayName: 'Siswa Pengujian',
        nisn: '0091100012',
        gradeGroup: 'X A',
        password: 'SiswaPengujian!2026',
      });
    expect(registered.status).toBe(202);
    user = await ctx.adminDb('users').where({ nisn: '0091100012' }).first();
    expect((await student.login(user.nisn, 'SiswaPengujian!2026')).loginRes.status).toBe(401);
    operator = await ctx.createAgent();
    expect(
      (await operator.login('operator@example.test', 'PengelolaPengujian!2026')).loginRes.status
    ).toBe(200);
    expect(
      (
        await operator.agent
          .post(`/api/superadmin/users/${user.id}/registration-review`)
          .set('x-csrf-token', operator.csrfToken)
          .send({ decision: 'approve' })
      ).status
    ).toBe(200);
    const admitted = (await student.login(user.nisn, 'SiswaPengujian!2026')).loginRes;
    expect(admitted.body.data.consentStatus.canUsePersonalFeatures).toBe(true);
    expect(admitted.body.data.consentStatus.hasActiveConsent).toBe(false);
    expect(admitted.body.data.consentStatus.required).toBe(false);
  });
  afterAll(async () => {
    await ctx.teardown();
  });

  const post = (path, body, headers = {}) => {
    let req = student.agent.post(`/api${path}`).set('x-csrf-token', student.csrfToken);
    for (const [key, value] of Object.entries(headers)) req = req.set(key, value);
    return req.send(body);
  };

  it('menyimpan semua fitur inti tanpa kebijakan, persetujuan palsu, atau data aktivitas bawaan', async () => {
    for (const table of [
      'consents',
      'consent_policies',
      'mood_entries',
      'journal_entries',
      'tasks',
      'weekly_reflections',
      'help_requests',
    ]) {
      expect(await ctx.adminDb(table).count('* as n').first(), table).toEqual({ n: '0' });
    }
    for (const path of [
      '/moods',
      '/journals',
      '/tasks',
      '/schedule-blocks',
      '/reflections',
      '/reminders',
      '/reminders/due',
      '/help-requests',
      '/exercise-sessions',
    ]) {
      expect((await student.agent.get(`/api${path}`)).status, path).toBe(200);
    }
    expect((await post('/moods', { moodCode: 'neutral', pressureLevel: 4 })).status).toBe(201);
    const journal = await post('/journals', {
      situation: 'Situasi pengujian',
      thoughts: 'Pikiran pengujian',
      feelings: 'Perasaan pengujian',
    });
    expect(journal.status).toBe(201);
    const task = await post('/tasks', { title: 'Tugas pengujian', estimatedMinutes: 20 });
    expect(task.status).toBe(201);
    expect(
      (await post(`/tasks/${task.body.data.task.id}/steps`, { title: 'Langkah pertama' })).status
    ).toBe(201);
    expect(
      (
        await post('/schedule-blocks', {
          blockType: 'rest',
          title: 'Jeda pengujian',
          startTime: '16:00',
          endTime: '16:15',
        })
      ).status
    ).toBe(201);
    expect(
      (
        await post('/reflections', {
          helpful: 'Jeda',
          obstacle: 'Waktu',
          plan: 'Satu langkah',
          strategyTags: [],
        })
      ).status
    ).toBe(201);
    expect(
      (
        await student.agent
          .put('/api/reminders')
          .set('x-csrf-token', student.csrfToken)
          .send({
            enabled: true,
            reminderType: 'jeda_belajar',
            daysOfWeek: [1, 2, 3, 4, 5],
            preferredTime: '16:00',
            quietHoursStart: '21:00',
            quietHoursEnd: '06:00',
          })
      ).status
    ).toBe(200);
    const exercises = (await student.agent.get('/api/exercises')).body.data.exercises;
    expect(exercises).toHaveLength(1);
    expect(exercises[0].slug).toBe('jeda-belajar-mandiri');
    const session = await post('/exercise-sessions', { exerciseId: exercises[0].id });
    expect(session.status).toBe(201);
    expect(
      (
        await student.agent
          .patch(`/api/exercise-sessions/${session.body.data.session.id}`)
          .set('x-csrf-token', student.csrfToken)
          .send({ status: 'stopped', activeSeconds: 0 })
      ).status
    ).toBe(200);
    const help = await post(
      '/help-requests',
      { topicMessage: 'Permintaan pengujian' },
      { 'Idempotency-Key': 'dashboard-clean-help-0001' }
    );
    expect(help.status).toBe(201);
    expect((await student.agent.get('/api/help-requests')).body.data.requests[0].topicMessage).toBe(
      'Permintaan pengujian'
    );
    expect((await operator.agent.get('/api/superadmin/help-requests')).status).toBe(200);
    expect((await student.agent.get('/api/articles')).body.data.articles).toHaveLength(3);
    expect(await installProductGuides(ctx.adminDb, schoolId)).toEqual({
      exercisesCreated: 0,
      articlesCreated: 0,
    });
    expect((await ctx.adminDb('consents').count('* as n').first()).n).toBe('0');
    expect(
      (await student.agent.get('/api/auth/session')).body.data.consentStatus.canUsePersonalFeatures
    ).toBe(true);
    expect(await eligibleStudentIds(ctx.adminDb, schoolId)).toContainEqual({ id: user.id });
  });

  it('jeda dan aktifkan kembali menghormati pilihan siswa tanpa membuat persetujuan otomatis', async () => {
    expect((await post('/consents/withdraw', {})).status).toBe(200);
    const state = (await student.agent.get('/api/auth/session')).body.data;
    expect(state.authenticated).toBe(true);
    expect(state.consentStatus.canUsePersonalFeatures).toBe(false);
    expect(state.consentStatus.paused).toBe(true);
    expect((await post('/moods', { moodCode: 'neutral' })).status).toBe(403);
    expect(await eligibleStudentIds(ctx.adminDb, schoolId)).toEqual([]);
    expect((await student.agent.post('/api/consents/resume').send({})).status).toBe(403);
    expect((await post('/consents/resume', {})).status).toBe(200);
    expect((await post('/moods', { moodCode: 'neutral' })).status).toBe(201);
    expect((await ctx.adminDb('consents').count('* as n').first()).n).toBe('0');
  });

  it('akun baru dapat memuat pengingat paralel tanpa konflik atau pengiriman ganda', async () => {
    const firstLoads = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        student.agent.get(index % 2 ? '/api/reminders' : '/api/reminders/due')
      )
    );
    expect(firstLoads.map((response) => response.status)).toEqual(Array(12).fill(200));
    expect(await ctx.adminDb('reminder_preferences').where({ user_id: user.id })).toHaveLength(1);
    const now = new Date();
    const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
    const hhmm = (offset) => {
      const value = (minute + offset) % 1440;
      return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    };
    expect(
      (
        await student.agent
          .put('/api/reminders')
          .set('x-csrf-token', student.csrfToken)
          .send({
            enabled: true,
            reminderType: 'jeda_belajar',
            daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
            preferredTime: '00:00',
            timezone: 'UTC',
            quietHoursStart: hhmm(120),
            quietHoursEnd: hhmm(121),
          })
      ).status
    ).toBe(200);
    const deliveries = await Promise.all(
      Array.from({ length: 8 }, () => student.agent.get('/api/reminders/due'))
    );
    expect(deliveries.map((response) => response.status)).toEqual(Array(8).fill(200));
    expect(deliveries.filter((response) => response.body.data.due)).toHaveLength(1);
    expect(await ctx.adminDb('notification_deliveries').where({ user_id: user.id })).toHaveLength(
      1
    );
  });
});
