import type { z } from 'zod';
import type { subscriptionStatusSchema } from '../schemas';

export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
