import crypto from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { asyncHandler, sendSuccess } from '../../lib/response.js';
import { badRequest } from '../../lib/errors.js';
import { decryptSensitiveText, encryptSensitiveText } from '../../lib/encryption.js';
import { getLocalTimeParts, isWithinQuietHours } from '../../lib/time.js';
import { resolveVapidKeys, sendWebPushNotification } from '../../lib/web-push.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { assertOwnership } from '../../policies/ownership.policy.js';
import { timezoneSchema, clockTimeSchema } from '../../lib/validation.js';

export const reminderSchema = z.object({
  enabled: z.boolean(),
  reminderType: z.enum(['jeda_belajar', 'cek_mood', 'refleksi_mingguan']),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  preferredTime: clockTimeSchema,
  timezone: timezoneSchema.optional(),
  quietHoursStart: clockTimeSchema,
  quietHoursEnd: clockTimeSchema,
});

const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .url('Endpoint push tidak valid.')
    .max(1000)
    .refine(
      (val) => {
        const u = new URL(val);
        return (
          u.protocol === 'https:' ||
          ((u.hostname === '127.0.0.1' || u.hostname === 'localhost') && u.protocol === 'http:')
        );
      },
      { message: 'Endpoint push harus menggunakan HTTPS atau loopback uji lokal.' }
    ),
  keys: z.object({
    p256dh: z.string().trim().min(40).max(300),
    auth: z.string().trim().min(16).max(160),
  }),
  userAgentLabel: z.string().trim().min(2).max(160).optional(),
});

const pushTestSchema = z.object({
  forceDeviceCheck: z.boolean().optional().default(false),
});

const idParamSchema = z.object({ id: z.string().uuid() });

function presentReminder(row) {
  return {
    id: row.id,
    enabled: Boolean(row.enabled),
    reminderType: row.reminder_type,
    daysOfWeek: Array.isArray(row.days_of_week) ? row.days_of_week : [1, 2, 3, 4, 5],
    preferredTime: row.preferred_time,
    timezone: row.timezone,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    channelInfo:
      'Mendukung pengingat dalam aplikasi dan push notification eksternal opsional (opt-in) dengan teks netral serta penghormatan jam tenang.',
  };
}

function presentPushSubscription(row) {
  let hostLabel = 'Browser Push';
  try {
    hostLabel = new URL(row.endpoint).host;
  } catch {
    hostLabel = 'Browser Push';
  }
  return {
    id: row.id,
    endpointHost: hostLabel,
    userAgentLabel: row.user_agent_label,
    isActive: Boolean(row.is_active),
    lastTestedAt: row.last_tested_at,
    lastDeliveredAt: row.last_delivered_at,
    createdAt: row.created_at,
  };
}

export function createRemindersRouter({
  db,
  env,
  csrf,
  authenticate,
  authorize,
  requireConsent,
  pushTransport = null,
}) {
  const router = express.Router();
  const guard = [authenticate, authorize(['student']), requireConsent];

  async function ensurePreference(user) {
    let pref = await db('reminder_preferences').where({ user_id: user.id }).first();
    if (!pref) {
      const school = await db('schools').select('timezone').where({ id: user.schoolId }).first();
      const [created] = await db('reminder_preferences')
        .insert({
          id: crypto.randomUUID(),
          school_id: user.schoolId,
          user_id: user.id,
          enabled: false,
          reminder_type: 'jeda_belajar',
          days_of_week: JSON.stringify([1, 2, 3, 4, 5]),
          preferred_time: '16:00',
          timezone: school?.timezone || 'Asia/Jakarta',
          quiet_hours_start: '21:30',
          quiet_hours_end: '06:00',
        })
        .onConflict('user_id')
        .ignore()
        .returning('*');
      pref = created || (await db('reminder_preferences').where({ user_id: user.id }).first());
    }
    return pref;
  }

  router.get(
    '/',
    ...guard,
    asyncHandler(async (req, res) => {
      const pref = await ensurePreference(req.currentUser);
      return sendSuccess(res, { preference: presentReminder(pref) });
    })
  );

  router.put(
    '/',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: reminderSchema }),
    asyncHandler(async (req, res) => {
      const pref = await ensurePreference(req.currentUser);
      const b = req.validatedBody;
      const [updated] = await db('reminder_preferences')
        .where({ id: pref.id })
        .update({
          enabled: b.enabled,
          reminder_type: b.reminderType,
          days_of_week: JSON.stringify(b.daysOfWeek),
          preferred_time: b.preferredTime,
          timezone: b.timezone || pref.timezone,
          quiet_hours_start: b.quietHoursStart,
          quiet_hours_end: b.quietHoursEnd,
          updated_at: new Date(),
        })
        .returning('*');

      return sendSuccess(res, { preference: presentReminder(updated) });
    })
  );

  router.get(
    '/due',
    ...guard,
    asyncHandler(async (req, res) => {
      const pref = await ensurePreference(req.currentUser);
      if (!pref.enabled) {
        return sendSuccess(res, { due: false, reminder: null });
      }

      const { localDate, isoWeekday, timeHHMM, minutesFromMidnight } = getLocalTimeParts(
        new Date(),
        pref.timezone
      );
      const days = Array.isArray(pref.days_of_week) ? pref.days_of_week : [];
      if (!days.includes(isoWeekday)) {
        return sendSuccess(res, { due: false, reminder: null });
      }

      if (isWithinQuietHours(timeHHMM, pref.quiet_hours_start, pref.quiet_hours_end)) {
        return sendSuccess(res, { due: false, quietHoursActive: true, reminder: null });
      }

      const [prefH, prefM] = pref.preferred_time.split(':').map(Number);
      const prefMinutes = prefH * 60 + prefM;
      if (minutesFromMidnight < prefMinutes) {
        return sendSuccess(res, { due: false, reminder: null });
      }

      const occurrenceKey = `${pref.reminder_type}:${localDate}`;
      const alreadyDelivered = await db('notification_deliveries')
        .where({ user_id: req.currentUser.id, occurrence_key: occurrenceKey })
        .first();

      if (alreadyDelivered) {
        return sendSuccess(res, { due: false, reminder: null });
      }

      const claimed = await db('notification_deliveries')
        .insert({
          id: crypto.randomUUID(),
          reminder_id: pref.id,
          user_id: req.currentUser.id,
          occurrence_key: occurrenceKey,
          channel: 'in_app',
          status: 'delivered',
        })
        .onConflict(['user_id', 'occurrence_key'])
        .ignore()
        .returning('id');
      if (!claimed.length) return sendSuccess(res, { due: false, reminder: null });

      const safeMessages = {
        jeda_belajar: 'Ada waktu untuk jeda singkat 3 menit di sela belajarmu?',
        cek_mood: 'Bagaimana perasaanmu hari ini? Kamu boleh mengisinya atau melewati.',
        refleksi_mingguan: 'Akhir pekan tiba. Ada waktu sejenak untuk refleksi mingguan?',
      };

      return sendSuccess(res, {
        due: true,
        reminder: {
          type: pref.reminder_type,
          occurrenceKey,
          message: safeMessages[pref.reminder_type] || safeMessages.jeda_belajar,
        },
      });
    })
  );

  // === L01: Push Notification Eksternal (Opt-In, Pencabutan, Jam Tenang, & Uji Perangkat) ===
  router.get(
    '/push/status',
    ...guard,
    asyncHandler(async (req, res) => {
      const vapid = resolveVapidKeys(env);
      const rows = await db('push_subscriptions')
        .where({ user_id: req.currentUser.id, is_active: true })
        .orderBy('created_at', 'desc');

      return sendSuccess(res, {
        vapidPublicKey: vapid.publicKey,
        pushConfigured: true,
        isEphemeralKey: vapid.isEphemeral,
        subscriptions: rows.map(presentPushSubscription),
      });
    })
  );

  router.post(
    '/push/subscriptions',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: pushSubscriptionSchema }),
    asyncHandler(async (req, res) => {
      const { endpoint, keys, userAgentLabel } = req.validatedBody;
      const now = new Date();
      const p256dhEncrypted = encryptSensitiveText(keys.p256dh, env.keyRing);
      const authEncrypted = encryptSensitiveText(keys.auth, env.keyRing);

      const existing = await db('push_subscriptions')
        .where({ user_id: req.currentUser.id, endpoint })
        .first();

      let row;
      if (existing) {
        [row] = await db('push_subscriptions')
          .where({ id: existing.id })
          .update({
            p256dh_encrypted: p256dhEncrypted,
            auth_encrypted: authEncrypted,
            user_agent_label: userAgentLabel || existing.user_agent_label,
            is_active: true,
            revoked_at: null,
            updated_at: now,
          })
          .returning('*');
      } else {
        [row] = await db('push_subscriptions')
          .insert({
            id: crypto.randomUUID(),
            school_id: req.currentUser.schoolId,
            user_id: req.currentUser.id,
            endpoint,
            p256dh_encrypted: p256dhEncrypted,
            auth_encrypted: authEncrypted,
            user_agent_label: userAgentLabel || 'Browser Perangkat Ini',
            is_active: true,
          })
          .returning('*');
      }

      return sendSuccess(res, { subscription: presentPushSubscription(row) }, 201);
    })
  );

  router.delete(
    '/push/subscriptions/:id',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ params: idParamSchema }),
    asyncHandler(async (req, res) => {
      const existing = await db('push_subscriptions').where({ id: req.validatedParams.id }).first();
      assertOwnership(existing, req.currentUser.id, 'Langganan push tidak ditemukan.');

      await db('push_subscriptions').where({ id: existing.id }).del();
      return sendSuccess(res, { revoked: true, id: existing.id });
    })
  );

  router.delete(
    '/push/subscriptions',
    ...guard,
    csrf.csrfProtection,
    asyncHandler(async (req, res) => {
      const removed = await db('push_subscriptions').where({ user_id: req.currentUser.id }).del();
      return sendSuccess(res, { revokedAll: true, count: removed });
    })
  );

  router.post(
    '/push/test',
    ...guard,
    csrf.csrfProtection,
    validateRequest({ body: pushTestSchema }),
    asyncHandler(async (req, res) => {
      const pref = await ensurePreference(req.currentUser);
      const subs = await db('push_subscriptions').where({
        user_id: req.currentUser.id,
        is_active: true,
      });

      if (subs.length === 0) {
        throw badRequest(
          'Belum ada perangkat terdaftar untuk push notification.',
          { push: 'Aktifkan opt-in push terlebih dahulu.' },
          'NO_PUSH_SUBSCRIPTION'
        );
      }

      const { timeHHMM } = getLocalTimeParts(new Date(), pref.timezone);
      const quietActive = isWithinQuietHours(
        timeHHMM,
        pref.quiet_hours_start,
        pref.quiet_hours_end
      );
      if (quietActive && !req.validatedBody.forceDeviceCheck) {
        return sendSuccess(res, {
          delivered: 0,
          skippedQuietHours: true,
          timezone: pref.timezone,
          message: `Sedang masuk jam tenang (${pref.quiet_hours_start}–${pref.quiet_hours_end} ${pref.timezone}). Push tidak dikirim.`,
        });
      }

      const vapid = resolveVapidKeys(env);
      const transport = pushTransport || fetch;
      const results = [];
      let delivered = 0;

      for (const sub of subs) {
        const p256dh = decryptSensitiveText(sub.p256dh_encrypted, env.keyRing);
        const auth = decryptSensitiveText(sub.auth_encrypted, env.keyRing);
        try {
          const outcome = await sendWebPushNotification({
            subscription: { endpoint: sub.endpoint, p256dh, auth },
            payload: {
              title: 'TENANGIN.ID',
              body: 'Uji perangkat berhasil. Pengingatmu selalu netral dan menjaga privasi.',
              tag: 'tenangin-device-test',
              url: '/app',
            },
            vapidKeys: vapid,
            transport,
          });
          if (outcome.expired) {
            await db('push_subscriptions')
              .where({ id: sub.id })
              .update({ is_active: false, revoked_at: new Date(), updated_at: new Date() });
            results.push({ id: sub.id, status: outcome.status, outcome: 'expired_revoked' });
          } else if (outcome.ok) {
            delivered += 1;
            await db('push_subscriptions')
              .where({ id: sub.id })
              .update({ last_tested_at: new Date(), updated_at: new Date() });
            results.push({ id: sub.id, status: outcome.status, outcome: 'delivered' });
          } else {
            results.push({ id: sub.id, status: outcome.status, outcome: 'gateway_rejected' });
          }
        } catch {
          results.push({ id: sub.id, status: 0, outcome: 'network_unreachable_simulated' });
        }
      }

      return sendSuccess(res, {
        delivered,
        skippedQuietHours: false,
        testedCount: subs.length,
        results,
        message:
          delivered > 0
            ? `Notifikasi uji berhasil dikirim ke ${delivered} perangkat dengan isi netral.`
            : 'Paket push terenkripsi VAPID berhasil disusun (endpoint simulasi/tidak terhubung ke push gateway eksternal).',
      });
    })
  );

  return router;
}
