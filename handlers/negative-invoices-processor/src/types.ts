import { z } from 'zod';

export const BigQueryRecordSchema = z
	.object({
		id: z.string(),
		accountId: z.string(),
		invoiceBalance: z.number(),
	})
	.strict();
export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;

export const BigQueryResultDataSchema = z.array(BigQueryRecordSchema);
