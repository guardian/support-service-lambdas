export const typeObject = {
	GuardianLight: {
		billingPeriods: ['Month'],
		productRatePlans: {
			Monthly: {
				currencies: { GBP: {}, USD: {} },
			},
		},
	},
} as const;

type TypeObject = typeof typeObject;

export type ProductKey = keyof TypeObject;

export type ProductRatePlanKey<P extends ProductKey> =
	keyof TypeObject[P]['productRatePlans'];

export type ProductRatePlanCurrency<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof (TypeObject[P]['productRatePlans'][PRP] & {
	currencies: Record<string, unknown>;
})['currencies'];

export const currency: ProductRatePlanCurrency<'GuardianLight', 'Monthly'> =
	'USD';
