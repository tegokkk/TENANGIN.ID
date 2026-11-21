import crypto from 'node:crypto';
import { loadEnv } from '../../config/env.js';
import { decryptSensitiveText } from '../../lib/encryption.js';
import { getLocalTimeParts, isWithinQuietHours } from '../../lib/time.js';
import { resolveVapidKeys, sendWebPushNotification } from '../../lib/web-push.js';
import { eligibleStudentIds } from '../../policies/consent-eligibility.policy.js';

const NEUTRAL_MESSAGES = {
  jeda_belajar: 'Ada waktu untuk jeda singkat 3 menit di sela belajarmu?',
  cek_mood: 'Ada waktu sejenak untuk melihat bagaimana perasaanmu hari ini?',
  refleksi_mingguan: 'Akhir pekan tiba. Ada waktu sejenak untuk refleksi mingguan?',
};

export async function dispatchDuePushReminders(
  db,
  env = null,
  logger = null,
  { now = new Date(), transport = fetch } = {}
) {
  const runtimeEnv = env || loadEnv();
  const vapidKeys = resolveVapidKeys(runtimeEnv);

  const activeSchools = await db('schools').where({ is_active: true }).select('id');
  const prefs = [];
  for (const school of activeSchools) {
    const schoolPrefs = await db('reminder_preferences as rp')
      .join('users as u', 'rp.user_id', 'u.id')
      .where({
        'rp.enabled': true,
        'rp.school_id': school.id,
        'u.status': 'active',
        'u.role': 'student',
      })
      .whereIn('u.id', eligibleStudentIds(db, school.id))
      .select(
        'rp.id as reminder_id',
        'rp.user_id',
        'rp.school_id',
        'rp.reminder_type',
        'rp.days_of_week',
        'rp.preferred_time',
        'rp.timezone',
        'rp.quiet_hours_start',
        'rp.quiet_hours_end'
      );
    prefs.push(...schoolPrefs);
  }

  let sentCount = 0;
  let skippedQuietHours = 0;
  let revokedExpired = 0;

  for (const pref of prefs) {
    const subs = await db('push_subscriptions').where({ user_id: pref.user_id, is_active: true });
    if (subs.length === 0) continue;

    const { localDate, isoWeekday, timeHHMM, minutesFromMidnight } = getLocalTimeParts(
      now,
      pref.timezone || 'Asia/Jakarta'
    );
    const days = Array.isArray(pref.days_of_week) ? pref.days_of_week : [];
    if (!days.includes(isoWeekday)) continue;

    if (isWithinQuietHours(timeHHMM, pref.quiet_hours_start, pref.quiet_hours_end)) {
      skippedQuietHours += 1;
      continue;
    }

    const [prefH, prefM] = String(pref.preferred_time || '16:00').split(':').map(Number);
    if (minutesFromMidnight < prefH * 60 + prefM) continue;

    const occurrenceKey = `${pref.reminder_type}:${localDate}`;
    const alreadySent = await db('notification_deliveries')
      .where({ user_id: pref.user_id, occurrence_key: occurrenceKey })
      .first();
    if (alreadySent) continue;

    let anyOk = false;
    for (const sub of subs) {
      try {
        const p256dh = decryptSensitiveText(sub.p256dh_encrypted, runtimeEnv.keyRing);
        const auth = decryptSensitiveText(sub.auth_encrypted, runtimeEnv.keyRing);
        const outcome = await sendWebPushNotification({
          subscription: { endpoint: sub.endpoint, p256dh, auth },
          payload: {
            title: 'TENANGIN.ID',
            body: NEUTRAL_MESSAGES[pref.reminder_type] || NEUTRAL_MESSAGES.jeda_belajar,
            tag: `tenangin-${pref.reminder_type}`,
            url: '/app',
          },
          vapidKeys,
          transport,
        });

        if (outcome.expired) {
          revokedExpired += 1;
          await db('push_subscriptions')
            .where({ id: sub.id })
            .update({ is_active: false, revoked_at: now, updated_at: now });
        } else if (outcome.ok) {
          anyOk = true;
          sentCount += 1;
          await db('push_subscriptions')
            .where({ id: sub.id })
            .update({ last_delivered_at: now, updated_at: now });
        }
      } catch {
        // Kegagalan jaringan tidak melempar isi pribadi dan dapat dicoba lagi oleh worker
      }
    }

    if (anyOk) {
      await db('notification_deliveries')
        .insert({
          id: crypto.randomUUID(),
          reminder_id: pref.reminder_id,
          user_id: pref.user_id,
          occurrence_key: occurrenceKey,
          channel: 'web_push',
          status: 'delivered',
          delivered_at: now,
        })
        .onConflict(['user_id', 'occurrence_key'])
        .ignore();
    }
  }

  if (logger) {
    logger.info('job_dispatch_push_done', { sentCount, skippedQuietHours, revokedExpired });
  }

  return { sentCount, skippedQuietHours, revokedExpired };
}
