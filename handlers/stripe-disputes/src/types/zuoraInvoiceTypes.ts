import type { z } from 'zod';
import type {
	ZuoraGetInvoicePaymentQueryOutputResponseSchema,
	ZuoraGetInvoicePaymentQueryOutputSchema,
} from '../zod-schemas';

export type ZuoraInvoicePaymentQueryOutput = z.infer<
	typeof ZuoraGetInvoicePaymentQueryOutputSchema
>;
export type ZuoraInvoicePaymentQueryResponse = z.infer<
	typeof ZuoraGetInvoicePaymentQueryOutputResponseSchema
>;
