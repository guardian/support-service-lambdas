import { z } from 'zod';

export const BigQueryRecordSchema = z.object({
	id: z.string(),
	account_id: z.string(),
	invoice_date: z.string(),
	// currency: z.string().nullable(),
	invoice_amount: z.number(),
	invoice_balance: z.number(),
});
export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;

export const BigQueryResultDataSchema = z.array(BigQueryRecordSchema);
