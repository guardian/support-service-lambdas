import { z } from 'zod';

export type ZuoraCatalog = z.infer<typeof zuoraCatalogSchema>;
export type CatalogProduct = ZuoraCatalog['products'][number];
export type ZuoraProductRatePlan =
	ZuoraCatalog['products'][number]['productRatePlans'][number];
export type ZuoraProductRatePlanCharge =
	ZuoraProductRatePlan['productRatePlanCharges'][number];
export type Pricing = ZuoraProductRatePlanCharge['pricing'][number];

export type ProductId = string & { readonly __brand: 'ProductId' };
export type ProductRatePlanId = string & {
	readonly __brand: 'ProductRatePlanId';
};
export type ProductRatePlanChargeId = string & {
	readonly __brand: 'ProductRatePlanChargeId';
};

const zuoraIdSchema = <T extends string & { readonly __brand: string }>() =>
	z
		.string()
		.regex(/^[0-9a-f]{32}$/, 'zuora ids must be 32 lowercase hex characters')
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- need to refine during deserialisation
		.transform((val: string) => val as T);

export const productIdSchema = zuoraIdSchema<ProductId>();
export const productRatePlanIdSchema = zuoraIdSchema<ProductRatePlanId>();
export const productRatePlanChargeIdSchema =
	zuoraIdSchema<ProductRatePlanChargeId>();

export const zuoraCatalogSchema = z.object({
	products: z.array(
		z.object({
			id: productIdSchema,
			name: z.string(),
			description: z.string(),
			effectiveStartDate: z.string(),
			effectiveEndDate: z.string(),
			productRatePlans: z.array(
				z.object({
					id: productRatePlanIdSchema,
					status: z.string(),
					name: z.string(),
					effectiveStartDate: z.string(),
					effectiveEndDate: z.string(),
					TermType__c: z.string().nullable(),
					DefaultTerm__c: z.string().nullable(),

					productRatePlanCharges: z.array(
						z.object({
							id: productRatePlanChargeIdSchema,
							name: z.string(),
							type: z.string(),
							model: z.string(),
							pricing: z.array(
								z.object({
									currency: z.string(),
									price: z.nullable(z.number()),
									discountPercentage: z.nullable(z.number()),
								}),
							),
							endDateCondition: z.string(),
							billingPeriod: z.nullable(z.string()),
							triggerEvent: z.string(),
							description: z.nullable(z.string()),
						}),
					),
				}),
			),
		}),
	),
});
