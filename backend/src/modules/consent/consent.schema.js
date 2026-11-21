import { z } from 'zod';

export const submitConsentSchema = z.object({
  policyVersion: z.string().trim().min(1).max(32),
  decision: z.enum(['accepted', 'declined']),
  scope: z
    .object({
      personal_activities: z.boolean().optional(),
      group_aggregate: z.boolean().optional(),
    })
    .optional(),
});
