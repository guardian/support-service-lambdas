import type { z } from 'zod';
import type { paymentMethodToScrubSchema } from '../schemas';

/** One row of the work list, as the BigQuery query returns it. */
export type PaymentMethodToScrub = z.infer<typeof paymentMethodToScrubSchema>;
