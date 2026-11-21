import crypto from 'node:crypto';
import { badRequest, conflict, serviceUnavailable } from '../../lib/errors.js';
import { hashPassword } from '../../lib/password.js';
import { recordAuditEvent } from '../audit/audit.service.js';

export async function registerStudent(db, env, body) {
  const passwordHash = await hashPassword(body.password, env.isTest);
  try {
    await db.transaction(async (trx) => {
      const schools = await trx('schools')
        .where({ is_active: true })
        .modify((query) => {
          if (body.schoolCode) query.andWhere({ code: body.schoolCode });
        })
        .orderBy('created_at')
        .limit(2)
        .forUpdate();
      if (!schools.length)
        throw serviceUnavailable(
          'Pendaftaran belum tersedia. Hubungi pengelola layanan.',
          'REGISTRATION_UNAVAILABLE'
        );
      if (schools.length !== 1) throw badRequest('Pilih ruang layanan untuk pendaftaran.');
      const school = schools[0];
      const existing = await trx('users')
        .whereRaw('LOWER(nisn) = ? OR LOWER(account_code) = ?', [body.nisn, body.nisn])
        .first();
      const canResubmit =
        existing &&
        existing.role === 'student' &&
        existing.school_id === school.id &&
        existing.status === 'inactive' &&
        existing.registration_status === 'rejected';
      if (existing && !canResubmit)
        throw conflict('NISN sudah terdaftar. Masuk dengan akunmu atau hubungi Superadmin.');
      const count = await trx('users')
        .where({ school_id: school.id, role: 'student' })
        .whereNotIn('status', ['inactive', 'deletion_pending'])
        .count('* as count')
        .first();
      if (Number(count.count) >= school.max_students)
        throw badRequest(
          'Kuota pendaftaran siswa telah tercapai.',
          null,
          'SCHOOL_CAPACITY_REACHED'
        );
      // A fresh ID keeps a delayed decision for the rejected request from approving new data.
      if (canResubmit) await trx('users').where({ id: existing.id }).del();
      const userId = crypto.randomUUID();
      await trx('users').insert({
        id: userId,
        school_id: school.id,
        account_code: body.nisn,
        nisn: body.nisn,
        display_name: body.displayName,
        role: 'student',
        status: 'pending_activation',
        grade_group: body.gradeGroup,
        password_hash: passwordHash,
        password_changed_at: new Date(),
        mfa_enabled: false,
        registration_status: 'pending',
        registration_submitted_at: new Date(),
      });
      await recordAuditEvent(trx, {
        schoolId: school.id,
        actorRole: 'system',
        action: 'student_registration_submitted',
        targetType: 'user',
        targetId: userId,
        summary: 'Pendaftaran siswa diterima untuk ditinjau Superadmin.',
      });
    });
  } catch (error) {
    if (error.code === '23505')
      throw conflict('NISN sudah terdaftar. Masuk dengan akunmu atau hubungi Superadmin.');
    throw error;
  }
  return {
    status: 'pending_approval',
    message: 'Pendaftaran terkirim. Akun dapat digunakan setelah disetujui Superadmin.',
  };
}
