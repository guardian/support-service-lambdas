import { z } from 'zod';

export const BigQueryRecordSchema = z.object({
	id: z.string(),
	account_id: z.string(),
});
export type BigQueryRecord = z.infer<typeof BigQueryRecordSchema>;

export const BigQueryResultDataSchema = z.array(BigQueryRecordSchema);
