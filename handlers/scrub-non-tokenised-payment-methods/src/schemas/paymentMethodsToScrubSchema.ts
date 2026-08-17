import { z } from 'zod';

/**
 * One row of the work list, exactly as the BigQuery query selects it.
 *
 * Worth parsing rather than trusting. The query reads the Fivetran mirror, whose
 * columns are outside our control, and a renamed or dropped column would
 * otherwise flow through as undefined ids: Zuora would answer "cannot find
 * entity", every item would land on the skip path, and the run would go green
 * having done nothing. Failing here instead makes that loud.
 */
export const paymentMethodToScrubSchema = z.object({
	payment_method_id: z.string().min(1),
	account_id: z.string().min(1),
	account_number: z.string().min(1),
});

export const paymentMethodsToScrubSchema = z.array(paymentMethodToScrubSchema);
