import { handleAggregateWeeklyJob } from './handlers/aggregate-weekly.job.js';
import { handleCleanupRetentionJob } from './handlers/cleanup-retention.job.js';
import { handleDeleteAccountJob } from './handlers/delete-account.job.js';
import { dispatchDuePushReminders } from './handlers/dispatch-push.job.js';

export const JOB_QUEUES = {
  AGGREGATE_WEEKLY: 'aggregate-weekly',
  CLEANUP_RETENTION: 'cleanup-retention',
  DELETE_ACCOUNT: 'delete-account',
  DISPATCH_PUSH: 'dispatch-push-reminders',
};

export async function registerJobQueuesAndWorkers(boss, db, logger, env = null) {
  for (const queueName of Object.values(JOB_QUEUES)) {
    await boss.createQueue(queueName, {
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
    });
  }

  await boss.work(JOB_QUEUES.AGGREGATE_WEEKLY, async (jobs) => {
    for (const job of jobs) {
      await handleAggregateWeeklyJob(db, logger, job);
    }
  });

  await boss.work(JOB_QUEUES.CLEANUP_RETENTION, async (jobs) => {
    for (const job of jobs) {
      await handleCleanupRetentionJob(db, logger, job);
    }
  });

  await boss.work(JOB_QUEUES.DELETE_ACCOUNT, async (jobs) => {
    for (const job of jobs) {
      await handleDeleteAccountJob(db, logger, job);
    }
  });

  await boss.work(JOB_QUEUES.DISPATCH_PUSH, async (jobs) => {
    for (const _job of jobs) {
      await dispatchDuePushReminders(db, env, logger);
    }
  });

  // Jadwalkan agregasi mingguan (Senin 01:00), retensi harian (02:00), dan cek push pengingat (tiap 15 menit)
  await boss.schedule(JOB_QUEUES.AGGREGATE_WEEKLY, '0 1 * * 1', {}, { tz: 'Asia/Jakarta' });
  await boss.schedule(JOB_QUEUES.CLEANUP_RETENTION, '0 2 * * *', {}, { tz: 'Asia/Jakarta' });
  await boss.schedule(JOB_QUEUES.DISPATCH_PUSH, '*/15 * * * *', {}, { tz: 'Asia/Jakarta' });
}
