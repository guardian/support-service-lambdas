import { z } from 'zod';
import { InvoiceRecordsArraySchema } from '../shared';

// GetInvoices lambda - this handler doesn't take any input parameters
export type GetInvoicesInput = void;

export const GetInvoicesOutputSchema = z.object({
	invoicesCount: z.number(),
	invoices: InvoiceRecordsArraySchema,
});

export type GetInvoicesOutput = z.infer<typeof GetInvoicesOutputSchema>;
