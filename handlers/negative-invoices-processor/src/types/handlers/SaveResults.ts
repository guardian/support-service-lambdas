import { z } from 'zod';
import { InvoiceSchema, ProcessedInvoiceSchema } from '../shared';

export const SaveResultsInputSchema = z.object({
	invoicesCount: z.number(),
	invoices: z.array(InvoiceSchema),
	processedInvoices: z.array(ProcessedInvoiceSchema),
});
export type SaveResultsInput = z.infer<typeof SaveResultsInputSchema>;

export const SaveResultsOutputSchema = SaveResultsInputSchema.extend({
	s3UploadAttemptStatus: z.string(),
	filePath: z.string().optional(),
	error: z.string().optional(),
});
export type SaveResultsOutput = z.infer<typeof SaveResultsOutputSchema>;
