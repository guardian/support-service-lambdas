import type { z } from 'zod';
import type {
	ZuoraGetInvoiceItemQueryOutputResponseSchema,
	ZuoraGetInvoiceItemQueryOutputSchema,
} from '../zod-schemas';

export type ZuoraInvoiceItemQueryOutput = z.infer<
	typeof ZuoraGetInvoiceItemQueryOutputSchema
>;
export type ZuoraInvoiceItemQueryResponse = z.infer<
	typeof ZuoraGetInvoiceItemQueryOutputResponseSchema
>;
