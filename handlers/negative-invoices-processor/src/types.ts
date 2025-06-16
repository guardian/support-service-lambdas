import { z } from 'zod';

export const BigQueryRecordSchema = z
	.object({
		accountId: z.string(),
		invoiceItemId: z.string(),
		invoiceId: z.string(),
		invoiceNumber: z.string(),
		invoiceChargeAmount: z.number(),
		invoiceBalance: z.number(),
	})
	.strict();
export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;

export const BigQueryResultDataSchema = z.array(BigQueryRecordSchema);
