import { z } from 'zod';
import { validTargetProductKeys } from './prepare/switchesHelper';

export const productSwitchCommonRequestSchema = z.object({
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export const productSwitchRequestSchema = z.discriminatedUnion('mode', [
	z
		.object({
			mode: z.literal('switchToBasePrice'),
			targetProduct: z.enum(validTargetProductKeys),
		})
		.extend(productSwitchCommonRequestSchema.shape),
	z
		.object({
			mode: z.literal('switchWithPriceOverride'),
			newAmount: z.number().positive(),
			targetProduct: z.enum(validTargetProductKeys),
		})
		.extend(productSwitchCommonRequestSchema.shape),
	z
		.object({
			mode: z.literal('save'),
			targetProduct: z.enum(validTargetProductKeys),
		})
		.extend(productSwitchCommonRequestSchema.shape),
]);

export type SwitchMode = ProductSwitchRequestBody['mode'];

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;

export type ProductSwitchTargetBody =
	| Pick<
			Extract<ProductSwitchRequestBody, { mode: 'switchToBasePrice' | 'save' }>,
			'mode' | 'targetProduct'
	  >
	| Pick<
			Extract<ProductSwitchRequestBody, { mode: 'switchWithPriceOverride' }>,
			'mode' | 'targetProduct' | 'newAmount'
	  >;

export const zuoraSwitchResponseSchema = z.object({});

export type ZuoraSwitchResponse = z.infer<typeof zuoraSwitchResponseSchema>;

export const zuoraSwitchResponseWithIdsSchema = z.object({
	invoiceIds: z.array(z.string()).nonempty(),
});

export type ZuoraSwitchResponseWithIds = z.infer<
	typeof zuoraSwitchResponseWithIdsSchema
>;

export const zuoraGetAmendmentResponseSchema = z.object({
	id: z.string(),
	status: z.string(),
	type: z.string(),
	customerAcceptanceDate: z.string(),
});

export type ZuoraGetAmendmentResponse = z.infer<
	typeof zuoraGetAmendmentResponseSchema
>;
