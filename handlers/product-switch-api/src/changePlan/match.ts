// Remove 'default' from a key set
import {
	Product,
	ProductCatalog,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { GuardianCatalogKeys } from './getSinglePlanSubscriptionOrThrow';

// export type GuardianCatalogKeys<
// 	P extends ProductKey,
// 	RP extends ProductRatePlanKey<P>,
// > = {
// 	productKey: P;
// 	productRatePlanKey: RP;
// };

type MatchersExhaustive<R> = {
	[P in ProductKey]?: {
		[K in ProductRatePlanKey<P>]?: (ratePlan: ProductRatePlan<P, K>) => R;
	} & {
		default?: (ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R; // ideally should be required if keys are missing
	};
} & {
	default: (
		ratePlan: unknown, //ProductRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>,
	) => R;
};

type Matchers<R> = {
	[P in ProductKey]?: {
		[K in ProductRatePlanKey<P>]?: (ratePlan: ProductRatePlan<P, K>) => R;
	};
};

export function matchExhaustive<P extends ProductKey>(
	productCatalog: ProductCatalog,
	productCatalogKeys: GuardianCatalogKeys<P>,
) {
	return <R>(matchers: MatchersExhaustive<R>): R => {
		const product: Product<P> = productCatalog[productCatalogKeys.productKey];
		const ratePlans: Product<P>['ratePlans'] = product.ratePlans;
		const productRatePlanKey: ProductRatePlanKey<P> =
			productCatalogKeys.productRatePlanKey;
		const ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>> = ratePlans[
			productRatePlanKey
		];
		const defaultMatcher: (ratePlan: unknown) => R = matchers.default;
		const specificMatcher:
			| Record<
					ProductRatePlanKey<P>,
					(ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R
			  >
			| undefined = matchers[productCatalogKeys.productKey] as
			| Record<
					ProductRatePlanKey<P>,
					(ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R
			  >
			| undefined; // TODO contravariant fn arg
		const fn = specificMatcher
			? specificMatcher[productRatePlanKey]
			: defaultMatcher;
		// FIXME handle `default` at the lower level
		return fn(ratePlan);
	};
}

export function match<P extends ProductKey>(
	productCatalog: ProductCatalog,
	productCatalogKeys: GuardianCatalogKeys<P>,
	error: string,
) {
	return <R>(matchers: Matchers<R>): R => {
		const product: Product<P> = productCatalog[productCatalogKeys.productKey];
		const ratePlans: Product<P>['ratePlans'] = product.ratePlans;
		const productRatePlanKey: ProductRatePlanKey<P> =
			productCatalogKeys.productRatePlanKey;
		const ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>> = ratePlans[
			productRatePlanKey
		];
		const specificMatcher:
			| Record<
					ProductRatePlanKey<P>,
					(ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R
			  >
			| undefined = matchers[productCatalogKeys.productKey] as
			| Record<
					ProductRatePlanKey<P>,
					(ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R
			  >
			| undefined; // TODO contravariant fn arg
		if (specificMatcher === undefined) {
			throw new Error(`match error: ${productCatalogKeys}: ${error}`);
		}
		const fn = specificMatcher[productRatePlanKey];
		if (fn === undefined) {
			throw new Error(
				`match error: ${JSON.stringify(productCatalogKeys)}: ${error}`,
			);
		}
		return fn(ratePlan);
	};
}

// type GuardianCatalogKeys<PC extends ProductCatalog> = {
// 	productKey: keyof PC;
// 	productRatePlanKey: keyof PC[keyof PC];
// };

// type ExactTransformerForGuardianKeys<
// 	PC extends ProductCatalog,
// 	K extends GuardianCatalogKeys<PC>,
// 	R,
// > = {
// 	[P in K['productKey']]: {
// 		[Q in K['productRatePlanKey']]: (value: PC[P][Q]) => R;
// 	};
// };

// export function match<
// 	PC extends ProductCatalog,
// 	K extends GuardianCatalogKeys<PC>,
// 	R,
// >(productCatalog: PC, productCatalogKeys: K) {
// 	return <R>(
// 		matchers: ExactTransformerForGuardianKeys<PC, K, R>,
// 	): R | undefined => {
// 		const product = productCatalog[productCatalogKeys.productKey];
// 		const ratePlans: Product<P>['ratePlans'] = product.ratePlans;
// 		const productRatePlanKey: ProductRatePlanKey<P> =
// 			productCatalogKeys.productRatePlanKey;
// 		const ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>> = ratePlans[
// 			productRatePlanKey
// 		];
// 		const specificMatcher:
// 			| Record<
// 					ProductRatePlanKey<P>,
// 					(ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R
// 			  >
// 			| undefined = matchers[productCatalogKeys.productKey] as
// 			| Record<
// 					ProductRatePlanKey<P>,
// 					(ratePlan: ProductRatePlan<P, ProductRatePlanKey<P>>) => R
// 			  >
// 			| undefined; // TODO contravariant fn arg
// 		return specificMatcher
// 			? specificMatcher[productRatePlanKey](ratePlan)
// 			: undefined;
// 	};
// }

// type NarrowedRatePlan<P extends ProductKey> = P extends 'Contribution'
// 	? Extract<ProductRatePlanKey<P>, 'Monthly' | 'Annual'>
// 	: P extends 'SupporterPlus'
// 		? Extract<ProductRatePlanKey<P>, 'Monthly' | 'OneYearStudent'>
// 		: never;
//
// type NarrowedCatalogByProduct = {
// 	Contribution: 'Monthly' | 'Annual';
// 	SupporterPlus: 'Monthly' | 'OneYearStudent';
// };
// export type NarrowedGuardianCatalogKeys<M extends Record<string, string>> = {
// 	[P in keyof M]: {
// 		[K in M[P]]: GuardianCatalogKeys<P & ProductKey, K & ProductRatePlanKey<P>>;
// 	}[M[P]]; // union over the rate plans
// }[keyof M]; // union over the products
// // type MyNarrowedKeys = NarrowedGuardianCatalogKeys<NarrowedCatalogByProduct>;
// //
// // type RatePlansOf<M, P extends ProductKey> =
// // 	M extends Record<P, GuardianCatalogKeys<P, infer RP>> ? RP : never;
//
// type Matchers<P extends ProductKey, RP extends ProductRatePlanKey<P>, R> = {
// 	[K in P]: {
// 		[RPK in RP]: (ratePlan: ProductRatePlan<K, RPK>) => R;
// 	};
// };

// type MatchersO<
// 	M extends Record<ProductKey, GuardianCatalogKeys<any, any>>,
// 	R,
// > = {
// 	[P in keyof M & ProductKey]: {
// 		[RP in RatePlansOf<M, P>]: (ratePlan: any) => R; // rateplan is really ProductRatePlan<P, RP>
// 	};
// };

// // Narrow arbitrary strings to valid keys of a catalog
// function narrowKey<PC extends ProductCatalog, K extends keyof PC>(
// 	catalog: PC,
// 	rawProductKey: string,
// ): K | undefined {
// 	return (rawProductKey in catalog ? rawProductKey : undefined) as
// 		| K
// 		| undefined;
// }
//
// function narrowSubKey<
// 	Sub extends { ratePlans: Record<string, any> },
// 	K extends keyof Sub['ratePlans'],
// >(
// 	obj: Sub['ratePlans'],
// 	rawPlanKey: string,
// ): keyof Sub['ratePlans'] | undefined {
// 	return rawPlanKey in obj ? (rawPlanKey as keyof Sub['ratePlans']) : undefined;
// }
//
// function narrowBoth<
// 	PC extends ProductCatalog,
// 	K extends keyof PC,
// 	Sub extends { ratePlans: Record<string, any> },
// >(productCatalog: PC, rawProductKey: string, rawPlanKey: string) {
// 	// Narrow the strings to valid keys
// 	const v = (
// 		rawProductKey in productCatalog
// 			? ([rawProductKey, productCatalog[rawProductKey as K]] as const)
// 			: undefined
// 	);
// 	if (!v) throw new Error('Invalid product key');
// 	const [productKey, product] = v;
//
// 	const planKey =
// 		'ratePlans' in product && rawPlanKey in product.ratePlans
// 			? (rawPlanKey as keyof Sub['ratePlans'])
// 			: undefined;
// 	if (!planKey) throw new Error('Invalid plan key');
//
// 	// Build the subset key pair
// 	const productCatalogKeysNarrow = {
// 		productKey,
// 		productRatePlanKey: planKey,
// 	} as const;
// 	return productCatalogKeysNarrow;
// }

function demo<P extends ProductKey, RP extends ProductRatePlanKey<P>>(
	productCatalog: ProductCatalog,
	productCatalogKeys: GuardianCatalogKeys<P>,
) {
	const result = match(
		productCatalog,
		productCatalogKeys,
		'ooohh',
	)({
		Contribution: {
			Annual: (ratePlan) => ratePlan.billingPeriod,
			Monthly: (ratePlan) => ratePlan.billingPeriod,
		},
		HomeDelivery: {
			WeekendPlus: (ratePlan) => ratePlan.billingPeriod,
			// default: (ratePlan) => undefined,
		},
		// default: (ratePlan) => undefined,
	});

	// // These strings could come from anywhere (user input, JSON, etc.)
	// const rawProductKey = '';
	// const rawPlanKey = '';
	// const productCatalogKeysNarrow = narrowBoth(
	// 	productCatalog,
	// 	rawProductKey,
	// 	rawPlanKey,
	// );
	//
	// const result2 = match(
	// 	productCatalog,
	// 	productCatalogKeysNarrow,
	// )({
	// 	Contribution: {
	// 		Annual: (ratePlan) => ratePlan.billingPeriod,
	// 		Monthly: (ratePlan) => ratePlan.billingPeriod,
	// 	},
	// 	SupporterPlus: {
	// 		OneYearStudent: (ratePlan) => ratePlan.billingPeriod,
	// 		Monthly: (ratePlan) => ratePlan.billingPeriod,
	// 	},
	// });

	return result; // ?? result2;
}
console.log(demo.toString());

// example moved out of switchInformation.ts in favour of matchFluent instead
// const supporterPlus = (
// 	ratePlan: ProductRatePlan<'SupporterPlus', 'Monthly' | 'Annual'>,
// ) => {
// 	const { Contribution, ...nonContributionCharges } = ratePlan.charges;
//
// 	return {
// 		productRatePlanId: ratePlan.id,
// 		baseChargeIds: objectValues(nonContributionCharges).map(
// 			(charge) => charge.id,
// 		),
// 		contributionChargeId: ratePlan.charges.Contribution.id,
// 		catalogBasePrice: ratePlan.pricing[currency],
// 	};
// };
// const targetProduct = match(
// 	productCatalog,
// 	validTargetProductCatalogKeys,
// 	'hmhmhm',
// )<CatalogInformation['targetProduct'] & { catalogBasePrice: number }>({
// 	SupporterPlus: {
// 		Monthly: supporterPlus,
// 		Annual: supporterPlus,
// 	},
// 	DigitalSubscription: {
// 		Monthly: (ratePlan) => {
// 			return {
// 				productRatePlanId: ratePlan.id,
// 				baseChargeIds: objectValues(ratePlan.charges).map(
// 					(charge) => charge.id,
// 				),
// 				contributionChargeId: undefined,
// 				catalogBasePrice: ratePlan.pricing[currency],
// 			};
// 		},
// 	},
// });

// const supporterPlus2 = (
// 	ratePlan: ProductRatePlan<'SupporterPlus', 'Monthly' | 'Annual'>,
// ) => {
// 	return {
// 		productRatePlanId: ratePlan.id,
// 		chargeIds: getIfNonEmpty(
// 			objectValues(ratePlan.charges).map((charge) => charge.id),
// 			'cant happen',
// 		),
// 	};
// };
// const contribution2 = (
// 	ratePlan: ProductRatePlan<'Contribution', 'Monthly' | 'Annual'>,
// ) => {
// 	return {
// 		productRatePlanId: ratePlan.id,
// 		chargeIds: getIfNonEmpty(
// 			objectValues(ratePlan.charges).map((charge) => charge.id),
// 			'cant happen',
// 		),
// 	};
// };
// const sourceProduct: CatalogInformation['sourceProduct'] = match(
// 	productCatalog,
// 	singlePlanGuardianSubscription.productCatalogKeys,
// 	'unsupported subscription type',
// )<CatalogInformation['sourceProduct']>({
// 	SupporterPlus: {
// 		Monthly: supporterPlus2,
// 		Annual: supporterPlus2,
// 	},
// 	Contribution: {
// 		Monthly: contribution2,
// 		Annual: contribution2,
// 	},
// });
