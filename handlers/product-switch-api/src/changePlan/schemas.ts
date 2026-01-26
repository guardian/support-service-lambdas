import { z } from 'zod';
import { validTargetProductKeys } from './prepare/switchesHelper';

export const productSwitchRequestSchema = z.object({
	preview: z.boolean(),
	newAmount: z.optional(z.number().positive()),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
	applyDiscountIfAvailable: z.optional(z.boolean()),
});

export const productSwitchGenericRequestSchema = z
	.object({
		targetProduct: z.enum(validTargetProductKeys),
	})
	.extend(productSwitchRequestSchema.shape);

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;

export type ProductSwitchGenericRequestBody = z.infer<
	typeof productSwitchGenericRequestSchema
>;
export type ProductSwitchTargetBody = Pick<
	ProductSwitchGenericRequestBody,
	'targetProduct' | 'newAmount' | 'applyDiscountIfAvailable'
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
