import type { z } from 'zod';
import type {
	ZuoraGetPaymentQueryOutputResponseSchema,
	ZuoraGetPaymentQueryOutputSchema,
} from '../zod-schemas';

export type ZuoraPaymentQueryOutput = z.infer<
	typeof ZuoraGetPaymentQueryOutputSchema
>;
export type ZuoraPaymentQueryResponse = z.infer<
	typeof ZuoraGetPaymentQueryOutputResponseSchema
>;
