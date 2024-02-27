import { z } from 'zod';

export type ZuoraCatalog = z.infer<typeof zuoraCatalogSchema>;
export type CatalogProduct = ZuoraCatalog['products'][number];
export type ZuoraProductRatePlan =
	ZuoraCatalog['products'][number]['productRatePlans'][number];
export type ZuoraProductRatePlanCharge =
	ZuoraProductRatePlan['productRatePlanCharges'][number];
export type Pricing = ZuoraProductRatePlanCharge['pricing'][number];

export const zuoraCatalogSchema = z.object({
	products: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
			effectiveStartDate: z.string(),
			effectiveEndDate: z.string(),
			productRatePlans: z.array(
				z.object({
					id: z.string(),
					status: z.string(),
					name: z.string(),
					effectiveStartDate: z.string(),
					effectiveEndDate: z.string(),
					productRatePlanCharges: z.array(
						z.object({
							id: z.string(),
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
