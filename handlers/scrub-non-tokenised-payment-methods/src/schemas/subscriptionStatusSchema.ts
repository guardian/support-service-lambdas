import { z } from 'zod';

/**
 * Deliberately narrow. We only read the status, so parsing only that keeps the
 * job working on subscriptions in states the shared schema rejects.
 */
export const subscriptionStatusSchema = z.object({ status: z.string() });
