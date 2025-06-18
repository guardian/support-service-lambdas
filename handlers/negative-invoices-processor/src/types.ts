import { z } from 'zod';

export const BigQueryRecordSchema = z
	.object({
		invoiceId: z.string(),
		accountId: z.string(),
		invoiceNumber: z.string(),
		invoiceBalance: z.number(),
	})
	.strict();
export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;

export const BigQueryResultDataSchema = z.array(BigQueryRecordSchema);
