import { getLastCompletedWeekStart } from '../../lib/time.js';
import { computeWeeklySnapshots } from '../../modules/dashboard/aggregate-computation.service.js';

export async function handleAggregateWeeklyJob(db, logger, job) {
  const schools = job?.data?.schoolId
    ? await db('schools').where({ id: job.data.schoolId })
    : await db('schools').select('*');

  for (const school of schools) {
    const targetWeek =
      job?.data?.weekStart || getLastCompletedWeekStart(new Date(), school.timezone || 'Asia/Jakarta');
    const results = await computeWeeklySnapshots(db, school.id, targetWeek, school.timezone);
    if (logger) {
      logger.info('job_aggregate_weekly_done', {
        schoolId: school.id,
        weekStart: targetWeek,
        metrics: results.length,
      });
    }
  }
}
