import { processDeletionRequest } from '../../modules/privacy/privacy.routes.js';

export async function handleDeleteAccountJob(db, logger, job) {
  const requestId = job?.data?.deletionRequestId;
  if (!requestId) return;
  await processDeletionRequest(db, requestId);
  if (logger) {
    logger.info('job_delete_account_done', { deletionRequestId: requestId });
  }
}
