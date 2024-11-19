export const typeObject = {
	GuardianLight: {
		billingPeriods: ['Month'],
		productRatePlans: {
			Monthly: {
				currencies: { GBP: {} },
				charges: {
					GuardianLight: {},
				},
			},
		},
	},
} as const;

type TypeObject = typeof typeObject;

export type ProductKey = keyof TypeObject;

export type ProductRatePlanKey<P extends ProductKey> =
	keyof TypeObject[P]['productRatePlans'];

export type ProductRatePlanChargeKey<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof TypeObject[P]['productRatePlans'][PRP]['charges'];

export type ProductCurrency<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = keyof TypeObject[P]['productRatePlans'][PRP]['currencies'];

const blah: ProductRatePlanChargeKey<'GuardianLight', 'Monthly'> = 'currencies';
// export type ProductCurrency<
// 	P extends ProductKey,
// 	PRP extends ProductRatePlanKey<P>,
// > = keyof NonNullable<TypeObject[P]['productRatePlans'][PRP]['currencies']>;
