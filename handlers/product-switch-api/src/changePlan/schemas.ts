import { z } from 'zod';
import { validTargetProductKeys } from './prepare/switchesHelper';

export const productSwitchCommonRequestSchema = z.object({
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export const productSwitchRequestSchema = z
	.object({
		preview: z.boolean(),
		newAmount: z.optional(z.number().positive()),
		applyDiscountIfAvailable: z.optional(z.boolean()),
	})
	.extend(productSwitchCommonRequestSchema.shape);

export const productSwitchGenericRequestSchema = z.discriminatedUnion('mode', [
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

export type SwitchMode = ProductSwitchGenericRequestBody['mode'];

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;

export type ProductSwitchGenericRequestBody = z.infer<
	typeof productSwitchGenericRequestSchema
>;

export type ProductSwitchTargetBody =
	| Pick<
			Extract<
				ProductSwitchGenericRequestBody,
				{ mode: 'switchToBasePrice' | 'save' }
			>,
			'mode' | 'targetProduct'
	  >
	| Pick<
			Extract<
				ProductSwitchGenericRequestBody,
				{ mode: 'switchWithPriceOverride' }
			>,
			'mode' | 'targetProduct' | 'newAmount'
	  >;

export const zuoraSwitchResponseSchema = z.object({
	invoiceIds: z.optional(z.array(z.string())),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type ZuoraSwitchResponse = z.infer<typeof zuoraSwitchResponseSchema>;

export const zuoraGetAmendmentResponseSchema = z.object({
	id: z.optional(z.string()),
	status: z.optional(z.string()),
	type: z.optional(z.string()),
	customerAcceptanceDate: z.optional(z.string()),
	reasons: z.optional(
		z.array(z.object({ code: z.number(), message: z.string() })),
	),
});

export type ZuoraGetAmendmentResponse = z.infer<
	typeof zuoraGetAmendmentResponseSchema
>;
