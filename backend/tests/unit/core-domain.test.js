import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  getLastCompletedWeekStart,
  getLocalDateString,
  getWeekBounds,
  isWithinQuietHours,
} from '../../src/lib/time.js';
import {
  buildKeyRing,
  decryptSensitiveText,
  encryptSensitiveText,
} from '../../src/lib/encryption.js';
import { scoreScreeningResponse } from '../../src/modules/screening/scoring/score-response.js';
import { SIMULATION_SCREENING_FIXTURE } from '../../database/fixtures/simulation-screening.js';
import {
  applySecondarySuppression,
  applySuppression,
  MIN_K_THRESHOLD,
} from '../../src/policies/aggregate-privacy.policy.js';
import { canTransitionHelpStatus } from '../../src/modules/help-requests/help-state.js';

describe('Unit domain logic: time, encryption, scoring, suppression, help state', () => {
  it('supresi sekunder melindungi satu kelompok kecil di antara tiga kelas atau lebih', () => {
    const rows = [
      { scopeGroup: 'Semua Siswa', contributorCount: 20, value: 20, isSuppressed: false },
      { scopeGroup: 'Kelas X', contributorCount: null, value: null, isSuppressed: true },
      { scopeGroup: 'Kelas XI', contributorCount: 8, value: 8, isSuppressed: false },
      { scopeGroup: 'Kelas XII', contributorCount: 9, value: 9, isSuppressed: false },
    ];
    const result = applySecondarySuppression(rows);
    expect(result.filter((r) => r.scopeGroup !== 'Semua Siswa' && r.isSuppressed)).toHaveLength(2);
    expect(result.find((r) => r.scopeGroup === 'Kelas XI').contributorCount).toBeNull();
  });
  it('menghitung tanggal lokal & batas minggu Senin-Minggu lintas zona waktu Indonesia', () => {
    const utcMoment = new Date('2026-11-22T16:30:00.000Z'); // WIB: 23:30 (22 Nov, Minggu), WITA: 00:30 (23 Nov, Senin)
    expect(getLocalDateString(utcMoment, 'Asia/Jakarta')).toBe('2026-11-22');
    expect(getLocalDateString(utcMoment, 'Asia/Makassar')).toBe('2026-11-23');
    expect(getLocalDateString(utcMoment, 'Asia/Jayapura')).toBe('2026-11-23');

    expect(getWeekBounds('2026-11-22', 'Asia/Jakarta')).toEqual({
      weekStart: '2026-11-16',
      weekEnd: '2026-11-22',
    });
    expect(getWeekBounds('2026-11-23', 'Asia/Makassar')).toEqual({
      weekStart: '2026-11-23',
      weekEnd: '2026-11-29',
    });
    expect(getLastCompletedWeekStart(utcMoment, 'Asia/Jakarta')).toBe('2026-11-09');
  });

  it('memeriksa jam tenang termasuk rentang lewat tengah malam', () => {
    expect(isWithinQuietHours('22:00', '21:30', '06:00')).toBe(true);
    expect(isWithinQuietHours('05:30', '21:30', '06:00')).toBe(true);
    expect(isWithinQuietHours('14:00', '21:30', '06:00')).toBe(false);
    expect(isWithinQuietHours('13:00', '12:00', '14:00')).toBe(true);
  });

  it('mengenkripsi AES-256-GCM dan mendekripsi lintas rotasi key ring', () => {
    const k1 = crypto.randomBytes(32).toString('hex');
    const k2 = crypto.randomBytes(32).toString('hex');

    const ringV1 = buildKeyRing('k1', k1);
    const cipherV1 = encryptSensitiveText('Catatan pribadi siswa rahasia.', ringV1);
    expect(cipherV1.startsWith('v1:k1:')).toBe(true);
    expect(cipherV1).not.toContain('Catatan pribadi');

    const ringV2 = buildKeyRing('k2', k2, `k1:${k1}`);
    expect(decryptSensitiveText(cipherV1, ringV2)).toBe('Catatan pribadi siswa rahasia.');

    const cipherV2 = encryptSensitiveText('Entri baru setelah rotasi', ringV2);
    expect(cipherV2.startsWith('v1:k2:')).toBe(true);
    expect(decryptSensitiveText(cipherV2, ringV2)).toBe('Entri baru setelah rotasi');
  });

  it('menghitung skoring fixture berversi tanpa menganggap jawaban kosong sebagai nol', () => {
    const incomplete = scoreScreeningResponse(SIMULATION_SCREENING_FIXTURE, {
      sim_1: 2,
      sim_3: 1,
    });
    expect(incomplete.scoreStatus).toBe('incomplete');
    expect(incomplete.computedScore).toBeNull();

    const complete = scoreScreeningResponse(SIMULATION_SCREENING_FIXTURE, {
      sim_1: 3,
      sim_2: 0, // reverseScored => 3
      sim_3: 2,
    });
    expect(complete.scoreStatus).toBe('complete');
    expect(complete.computedScore).toBe(8);
  });

  it('menegakkan ambang supresi k=5 dan supresi tambahan', () => {
    expect(MIN_K_THRESHOLD).toBe(5);
    const suppressed = applySuppression({
      metric_key: 'weekly_active_students',
      metric_label: 'Siswa Aktif',
      scope_group: 'Kelas X',
      week_start: '2026-11-09',
      week_end: '2026-11-15',
      formula_version: 'v1',
      contributor_count: 4,
      metric_value: '4.00',
      is_suppressed: false,
      computed_at: new Date(),
    });
    expect(suppressed.isSuppressed).toBe(true);
    expect(suppressed.value).toBeNull();
    expect(suppressed.contributorCount).toBeNull();

    const groupItems = [
      { scopeGroup: 'Kelas X', isSuppressed: true, value: null, contributorCount: null },
      { scopeGroup: 'Kelas XI', isSuppressed: false, value: 6, contributorCount: 6 },
      { scopeGroup: 'Semua Siswa', isSuppressed: false, value: 8, contributorCount: 8 },
    ];
    applySecondarySuppression(groupItems);
    expect(groupItems[1].isSuppressed).toBe(true);
    expect(groupItems[1].value).toBeNull();
  });

  it('menegakkan state machine bantuan untuk siswa, superadmin, dan melarang BK', () => {
    expect(canTransitionHelpStatus('student', 'submitted', 'cancelled')).toBe(true);
    expect(canTransitionHelpStatus('student', 'closed', 'cancelled')).toBe(false);
    expect(canTransitionHelpStatus('student', 'submitted', 'acknowledged')).toBe(false);
    expect(canTransitionHelpStatus('bk', 'submitted', 'acknowledged')).toBe(false);
    expect(canTransitionHelpStatus('superadmin', 'submitted', 'acknowledged')).toBe(true);
    expect(canTransitionHelpStatus('superadmin', 'acknowledged', 'closed')).toBe(true);
    expect(canTransitionHelpStatus('superadmin', 'closed', 'acknowledged')).toBe(false);
  });
});
