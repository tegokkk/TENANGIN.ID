import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext } from '../setup/test-app.js';

describe('Mode data nyata menolak fixture skrining dan pengesahan template uji', () => {
  let fixture;
  let pilot;
  beforeAll(() => {
    fixture = createTestContext();
    pilot = createTestContext({ APP_MODE: 'pilot', ALLOW_DEMO_SEED: 'false' });
  });
  beforeEach(async () => {
    await fixture.resetAndSeed();
  });
  afterAll(async () => {
    await pilot.teardown();
    await fixture.teardown();
  });
  it('menolak jawaban untuk simulasi meskipun flag approved diubah', async () => {
    const instrument = await fixture
      .adminDb('screening_instruments')
      .where({ is_simulation: true })
      .first();
    await fixture
      .adminDb('screening_instruments')
      .where({ id: instrument.id })
      .update({ is_approved: true });
    const client = await pilot.createAgent();
    expect((await client.login('awan-028', 'SiswaDemo!2026')).loginRes.status).toBe(200);
    const active = await client.agent.get('/api/screening/active');
    expect(active.body.data.available).toBe(false);
    const response = await client.agent
      .post('/api/screening/responses')
      .set('x-csrf-token', client.csrfToken)
      .send({ instrumentId: instrument.id, answers: {} });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('INSTRUMENT_UNAPPROVED');
  });
  it('menolak pengaktifan template uji sebagai instrumen tervalidasi', async () => {
    const admin = await pilot.createAgent();
    const login = await admin.login('superadmin@tenangin.id', 'StafDemo!2026', 'KRSXG5CTMVRXEZLU');
    expect(login.mfaRes.status).toBe(200);
    const response = await admin.agent
      .post('/api/superadmin/screening-instruments/deploy-validated-template')
      .set('x-csrf-token', admin.csrfToken)
      .send({ approvalRef: 'SK-FIKTIF' });
    expect(response.status).toBe(403);
    expect(
      await fixture.adminDb('screening_instruments').where({ is_simulation: false }).first()
    ).toBeUndefined();
  });
});
