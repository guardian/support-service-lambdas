import { z } from 'zod';
import { InvoiceRecordsArraySchema } from '../shared';

export const GetInvoicesOutputSchema = z.object({
	invoicesCount: z.number(),
	invoices: InvoiceRecordsArraySchema,
});

export type GetInvoicesOutput = z.infer<typeof GetInvoicesOutputSchema>;
