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

export const PaymentMethodSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
});
