import type { z } from 'zod';
import type {
	ZuoraGetPaymentQueryOutputResponseSchema,
	ZuoraGetPaymentQueryOutputSchema,
} from '../zod-schemas';

/**
 * Zuora Payment API response types
 */

export type ZuoraPaymentQueryOutput = z.infer<
	typeof ZuoraGetPaymentQueryOutputSchema
>;
export type ZuoraPaymentQueryResponse = z.infer<
	typeof ZuoraGetPaymentQueryOutputResponseSchema
>;
