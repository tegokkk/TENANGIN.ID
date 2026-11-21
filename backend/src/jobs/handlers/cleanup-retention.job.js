import { runRetentionCleanup } from '../../modules/superadmin/superadmin.routes.js';

export async function handleCleanupRetentionJob(db, logger, job) {
  // API serverless tidak menjalankan timer pembersihan sesi di setiap instance.
  await db('user_sessions').where('expire', '<', new Date()).del();
  const retentionDays = Number(job?.data?.retentionDays || 90);
  const schools = job?.data?.schoolId
    ? await db('schools').where({ id: job.data.schoolId })
    : await db('schools').select('id');

  for (const school of schools) {
    const summary = await runRetentionCleanup(db, school.id, retentionDays);
    if (logger) {
      logger.info('job_cleanup_retention_done', { schoolId: school.id, ...summary });
    }
  }
}
