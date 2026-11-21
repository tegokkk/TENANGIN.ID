import crypto from 'node:crypto';
import { sanitizeForLog } from '../../lib/logger.js';

export async function recordAuditEvent(dbOrTrx, event) {
  const cleanSummary = String(event.summary || '').slice(0, 295);
  const sanitized = sanitizeForLog({
    targetId: event.targetId ? String(event.targetId).slice(0, 195) : null,
    summary: cleanSummary,
  });

  await dbOrTrx('audit_events').insert({
    id: crypto.randomUUID(),
    school_id: event.schoolId || null,
    actor_user_id: event.actorUserId || null,
    actor_code: event.actorCode || null,
    actor_role: event.actorRole || 'system',
    action: event.action,
    target_type: event.targetType,
    target_id: sanitized.targetId,
    outcome: event.outcome || 'success',
    summary: sanitized.summary,
  });
}
