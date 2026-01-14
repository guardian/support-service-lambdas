import {
	Product,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { BillingPeriod } from '@modules/billingPeriod';
import {
	BillingPeriodAlignment,
	RatePlan,
	RatePlanCharge,
	ZuoraSubscription,
} from '@modules/zuora/types';
import {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import {
	objectFromEntries,
	objectJoin,
	objectLeftJoin,
} from '@modules/objectFunctions';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import { groupMap, mapValues } from '@modules/arrayFunctions';

type CatalogByIdProductRatePlan = {
	id: string;
	status: string;
	name: string;
	effectiveStartDate: string;
	effectiveEndDate: string;
	TermType__c: string | null;
	DefaultTerm__c: string | null;
	productRatePlanCharges: Record<
		string, // product rate plan charge id
		ZuoraProductRatePlanCharge
	>;
};
type CatalogByProductIds = Record<
	string, // product id
	{
		id: string;
		name: string;
		description: string;
		effectiveStartDate: string;
		effectiveEndDate: string;
		productRatePlans: Record<
			string, // product rate plan id
			CatalogByIdProductRatePlan
		>;
	}
>;
type HighLevelRatePlan<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = {
	guardianProductKey: P;
	guardianProductRatePlanKey: PRP;
	id: string;
	productName: string;
	ratePlanName: string;
	lastChangeType?: string;
	product: {
		id: string;
		name: string;
		description: string;
		effectiveStartDate: string;
		effectiveEndDate: string;
	};
	productRatePlan: {
		id: string;
		status: string;
		name: string;
		effectiveStartDate: string;
		effectiveEndDate: string;
		TermType__c: string | null;
		DefaultTerm__c: string | null;
	};
	guardianProduct: Product<P>;
	guardianProductRatePlan: ProductRatePlan<P, PRP>;
	ratePlanCharges: Record<
		string,
		{
			id: string;
			number: string;
			name: string;
			type: string;
			model: string;
			currency: string;
			effectiveStartDate: Date;
			effectiveEndDate: Date;
			billingPeriod: BillingPeriod | null;
			processedThroughDate: Date;
			chargedThroughDate: Date | null;
			upToPeriodsType: string | null;
			upToPeriods: number | null;
			price: number | null;
			discountPercentage: number | null;
			billingPeriodAlignment: BillingPeriodAlignment | null;
			productRatePlanCharge: {
				id: string;
				name: string;
				type: string;
				model: string;
				pricing: Array<{
					currency: string;
					price: number | null;
					discountPercentage: number | null;
				}>;
				endDateCondition: string;
				billingPeriod: string | null;
				triggerEvent: string;
				description: string | null;
			};
		}
	>;
	billingPeriod: BillingPeriod | undefined;
};
/**
 * A high level subscription indexes the rate plans and charges by their guardian name (from the catalog)
 * In each rate plan it includes a copy of the product and productRatePlan
 * In each charge it includes a copy of the productRatePlanCharge
 */
export type HighLevelSubscription = {
	id: string;
	accountNumber: string;
	subscriptionNumber: string;
	status: string;
	contractEffectiveDate: Date;
	serviceActivationDate: Date;
	customerAcceptanceDate: Date;
	subscriptionStartDate: Date;
	subscriptionEndDate: Date;
	lastBookingDate: Date;
	termStartDate: Date;
	termEndDate: Date;
	ratePlans: Array<
		HighLevelRatePlan<ProductKey, ProductRatePlanKey<ProductKey>>
	>;
};

type RatePlanWithChargesById = Omit<RatePlan, 'ratePlanCharges'> & {
	idToRatePlanCharge: Record<string, RatePlanCharge>;
};

type ZuoraSubscriptionWithProductsById = Omit<
	ZuoraSubscription,
	'ratePlans'
> & {
	products: Record<
		string, // product id
		Record<
			string, // product rate plan id
			RatePlanWithChargesById[] // might have multiple of the same product, e.g. product switch and back again
		>
	>;
};

// type ZuoraSubscriptionWithProductRatePlansById = Omit<
// 	ZuoraSubscription,
// 	'ratePlans'
// > & {
// 	productRatePlans: Record<
// 		string, // product rate plan id
// 		RatePlanWithChargesById[]
// 	>;
// };

export type JoinedRatePlan = {
	guardianChargeKeyToSubCharge: Record<string, RatePlanCharge>;
} & Omit<RatePlanWithChargesById, 'idToRatePlanCharge'>;

// export type MergedRatePlan = {
// 	guardianSubRatePlans: JoinedRatePlan[];
// } & Omit<CommonRatePlan, 'charges'>;

export type MergedSubscription = {
	joinedByProduct: Record<ProductKey, Record<string, JoinedRatePlan[]>>;
} & Omit<ZuoraSubscriptionWithProductsById, 'products'>;

/**
 * this takes a basic zuora subscription and blends it with product catalog information to
 * return something more meaningful in a guardian context
 */
export class HighLevelSubParser {
	private catalogByProductIds: CatalogByProductIds;
	constructor(catalog: ZuoraCatalog) {
		this.catalogByProductIds = this.buildCatalogByIds(catalog);
	}

	/**
	 * This reindexes the zuora catalog by the various product IDs rather than guardian internal ids.
	 *
	 * This is essential when linking an existing subscription to its associated product catalog entry.
	 *
	 * @param catalog
	 */
	private buildCatalogByIds(catalog: ZuoraCatalog): CatalogByProductIds {
		return objectFromEntries(
			catalog.products.map((product: CatalogProduct) => {
				const productRatePlans = objectFromEntries(
					product.productRatePlans.map((prp: ZuoraProductRatePlan) => {
						const productRatePlanCharges = objectFromEntries(
							prp.productRatePlanCharges.map(
								(prpc: ZuoraProductRatePlanCharge) => [prpc.id, prpc],
							),
						);
						return [prp.id, { ...prp, productRatePlanCharges }];
					}),
				);
				return [product.id, { ...product, productRatePlans }];
			}),
		);
	}

	private buildSubscriptionByProductIds(
		subscription: ZuoraSubscription,
	): ZuoraSubscriptionWithProductsById {
		const { ratePlans, ...restSubscription } = subscription;
		const productIdProductRatePlanIdRatePlanTuple: readonly [
			string,
			readonly [string, RatePlanWithChargesById],
		][] = ratePlans.map((rp: RatePlan) => {
			const { ratePlanCharges, ...restRatePlan } = rp;
			const idToRatePlanCharge: Record<string, RatePlanCharge> =
				objectFromEntries(
					ratePlanCharges.map((rpc: RatePlanCharge) => [
						rpc.productRatePlanChargeId,
						rpc,
					]),
				);
			const ratePlanWithChargesById: RatePlanWithChargesById = {
				...restRatePlan,
				idToRatePlanCharge,
			};
			return [
				rp.productId,
				[rp.productRatePlanId, ratePlanWithChargesById] as const,
			] as const;
		});
		const byProduct: Record<
			string,
			(readonly [string, RatePlanWithChargesById])[]
		> = groupMap(
			productIdProductRatePlanIdRatePlanTuple,
			([productId]) => productId,
			([, productRatePlanMap]) => productRatePlanMap,
		);
		const products: Record<
			string,
			Record<string, RatePlanWithChargesById[]>
		> = mapValues(byProduct, (productRatePlanMap) =>
			groupMap(
				productRatePlanMap,
				([productRatePlanId]) => productRatePlanId,
				([, productRatePlanChargeMap]) => productRatePlanChargeMap,
			),
		);
		return {
			...restSubscription,
			products,
		};
	}

	// private buildSubscriptionByProductRatePlanIds(
	// 	subscription: ZuoraSubscription,
	// ): ZuoraSubscriptionWithProductRatePlansById {
	// 	const { ratePlans, ...restSubscription } = subscription;
	// 	const productRatePlanIdRatePlanTuple: readonly [
	// 		string,
	// 		RatePlanWithChargesById,
	// 	][] = ratePlans.map((rp: RatePlan) => {
	// 		const { ratePlanCharges, ...restRatePlan } = rp;
	// 		const idToRatePlanCharge: Record<string, RatePlanCharge> =
	// 			objectFromEntries(
	// 				ratePlanCharges.map((rpc: RatePlanCharge) => [
	// 					rpc.productRatePlanChargeId,
	// 					rpc,
	// 				]),
	// 			);
	// 		const ratePlanWithChargesById: RatePlanWithChargesById = {
	// 			...restRatePlan,
	// 			idToRatePlanCharge,
	// 		};
	// 		return [rp.productRatePlanId, ratePlanWithChargesById] as const;
	// 	});
	// 	const productRatePlans: Record<string, RatePlanWithChargesById[]> =
	// 		groupMap(
	// 			productRatePlanIdRatePlanTuple,
	// 			([productRatePlanId]) => productRatePlanId,
	// 			([, productRatePlanChargeMap]) => productRatePlanChargeMap,
	// 		);
	// 	return {
	// 		...restSubscription,
	// 		productRatePlans,
	// 	};
	// }
	//
	// private asHighLevelRatePlanCharge(
	// 	productRatePlanCharges: Record<string, ZuoraProductRatePlanCharge>,
	// 	rpc: RatePlanCharge,
	// ): [
	// 	string,
	// 	HighLevelSubscription['ratePlans'][number]['ratePlanCharges'][string],
	// ] {
	// 	const prpc: (typeof productRatePlanCharges)[typeof rpc.productRatePlanChargeId] =
	// 		getIfDefined(
	// 			productRatePlanCharges[rpc.productRatePlanChargeId],
	// 			'unknown product rate plan charge: ' + rpc.productRatePlanChargeId, // FIXME bit harsh? drop instead
	// 		);
	//
	// 	const { productRatePlanChargeId, ...restRpc } = rpc;
	// 	const productRatePlanChargeKey = getProductRatePlanChargeKey(prpc.name);
	// 	return [
	// 		productRatePlanChargeKey,
	// 		{
	// 			...restRpc,
	// 			productRatePlanCharge: {
	// 				...prpc,
	// 				// key: productRatePlanChargeKey,
	// 			},
	// 		},
	// 	] as const;
	// }

	// private asHighLevelRatePlan<
	// 	P extends ProductKey,
	// 	PRP extends ProductRatePlanKey<P>,
	// >(rp: RatePlan): HighLevelSubscription['ratePlans'][number] {
	// 	const { ratePlanCharges, productId, productRatePlanId, ...restRp } = rp;
	// 	const {
	// 		product,
	// 		productRatePlan,
	// 		guardianProductKey,
	// 		guardianProduct,
	// 		guardianProductRatePlanKey,
	// 		guardianProductRatePlan,
	// 	} = this.ddd<P, PRP>(productId, productRatePlanId);
	//
	// 	const { productRatePlanCharges, ...restProductRatePlan } = productRatePlan;
	//
	// 	const mergedRatePlanCharges = objectFromEntries(
	// 		ratePlanCharges.map((rpc) =>
	// 			this.asHighLevelRatePlanCharge(productRatePlanCharges, rpc),
	// 		),
	// 	);
	// 	// const billingPeriodList = objectValues(mergedRatePlanCharges).map(
	// 	// 	(rpc) => rpc.billingPeriod,
	// 	// );
	// 	const singleBillingPeriod: BillingPeriod | undefined =
	// 		guardianProductRatePlan.billingPeriod;
	//
	// 	return {
	// 		...restRp,
	// 		guardianProductKey,
	// 		guardianProductRatePlanKey,
	// 		product,
	// 		productRatePlan: restProductRatePlan,
	// 		guardianProduct,
	// 		guardianProductRatePlan,
	// 		ratePlanCharges: mergedRatePlanCharges,
	// 		billingPeriod: singleBillingPeriod,
	// 	} as const;
	// }
	//
	// private ddd<P extends ProductKey, PRP extends ProductRatePlanKey<P>>(
	// 	productId: string,
	// 	productRatePlanId: string,
	// ) {
	// 	const product: (typeof this.catalogByProductIds)[typeof productId] =
	// 		getIfDefined(
	// 			this.catalogByProductIds[productId],
	// 			'unknown product: ' + productId, // FIXME bit harsh? drop instead
	// 		);
	//
	// 	const { productRatePlans, ...restProduct } = product;
	//
	// 	const productRatePlan: (typeof product)['productRatePlans'][typeof productRatePlanId] =
	// 		getIfDefined(
	// 			product.productRatePlans[productRatePlanId],
	// 			'unknown product rate plan: ' + productRatePlanId, // FIXME bit harsh? drop instead
	// 		);
	//
	// 	const zuoraProductKey: ProductKey = getZuoraProductKey(product.name);
	// 	const guardianProduct: Product<ProductKey> =
	// 		this.productCatalog[zuoraProductKey];
	// 	const ratePlans = guardianProduct.ratePlans;
	// 	const productRatePlanKey: keyof typeof ratePlans = getProductRatePlanKey(
	// 		productRatePlan.name,
	// 	) as keyof typeof ratePlans; // FIXME type cast, somehow prove it right?
	// 	const guardianProductRatePlan: CommonRatePlan =
	// 		ratePlans[productRatePlanKey];
	// 	return {
	// 		product: restProduct,
	// 		productRatePlan,
	// 		guardianProductKey: zuoraProductKey,
	// 		guardianProduct,
	// 		guardianProductRatePlanKey: productRatePlanKey,
	// 		guardianProductRatePlan,
	// 	};
	// }

	asHighLevelSub(subscription: ZuoraSubscription): MergedSubscription {
		const subByProductIds: ZuoraSubscriptionWithProductsById =
			this.buildSubscriptionByProductIds(subscription);
		const mergedSubscription: MergedSubscription =
			this.mergeSubscription(subByProductIds);

		return mergedSubscription;

		// const mergedRatePlans: HighLevelSubscription['ratePlans'] =
		// 	subscription.ratePlans.map((rp) => this.asHighLevelRatePlan(rp));
		// const { ratePlans, ...restSubscription } = subscription;
		//
		// return {
		// 	...restSubscription,
		// 	ratePlans: mergedRatePlans,
		// };
	}
	private mergeSubscription(
		subByProductIds: Omit<ZuoraSubscription, 'ratePlans'> & {
			products: Record<string, Record<string, RatePlanWithChargesById[]>>;
		},
	) {
		const { products, ...restSubscription2 } = subByProductIds;
		const joinedByProduct: MergedSubscription['joinedByProduct'] =
			this.joinSubscription(products);
		const mergedSubscription: MergedSubscription = {
			joinedByProduct,
			...restSubscription2,
		};
		return mergedSubscription;
	}

	private joinSubscription(
		products: Record<string, Record<string, RatePlanWithChargesById[]>>,
	) {
		const guardianProductAndSusbcription = objectLeftJoin(
			products,
			this.catalogByProductIds,
		);
		const joinedByProduct: Record<
			ProductKey,
			Record<string, JoinedRatePlan[]>
		> = objectFromEntries(
			guardianProductAndSusbcription.map(
				([subByProductRatePlanId, zuoraProduct]) => {
					const guardianProductKey = getZuoraProductKey(zuoraProduct.name);

					const zuoraProductRatePlans = zuoraProduct.productRatePlans;
					const guardianSubAAA: Record<string, JoinedRatePlan[]> =
						this.mergeRatePlans(zuoraProductRatePlans, subByProductRatePlanId);
					return [guardianProductKey, guardianSubAAA];
				},
			),
		);
		return joinedByProduct;
	}

	private mergeRatePlans(
		zuoraProductRatePlans: Record<string, CatalogByIdProductRatePlan>,
		subByProductRatePlanId: Record<string, RatePlanWithChargesById[]>,
	): Record<string, JoinedRatePlan[]> {
		//MergedRatePlan> {
		const zuoraProductRatePlanAndSubRatePlans = objectLeftJoin(
			subByProductRatePlanId,
			zuoraProductRatePlans,
		);
		const guardianSubAAA = objectFromEntries(
			zuoraProductRatePlanAndSubRatePlans.map(
				([subRatePlans, zuoraProductRatePlan]) => {
					const guardianRatePlanKey = getProductRatePlanKey(
						zuoraProductRatePlan.name,
					);
					const guardianSubRatePlans: JoinedRatePlan[] = subRatePlans.map(
						(subRatePlan) => {
							return this.joinRatePlan(subRatePlan, zuoraProductRatePlan);
						},
					);
					return [
						guardianRatePlanKey,
						guardianSubRatePlans,
						// {
						// 	guardianSubRatePlans,
						// 	...restGuardianProductRatePlan,
						// } satisfies MergedRatePlan,
					];
				},
			),
		);
		return guardianSubAAA;
	}

	// private joinRatePlans(
	// 	subRatePlans: RatePlanWithChargesById[],
	// 	zuoraProductRatePlan: CatalogByIdProductRatePlan,
	// 	guardianCharges: CommonRatePlan['charges'],
	// ): JoinedRatePlan[] {
	// 	const guardianSubRatePlans = subRatePlans.map((subRatePlan) => {
	// 		return this.joinRatePlan(
	// 			subRatePlan,
	// 			zuoraProductRatePlan,
	// 			guardianCharges,
	// 		);
	// 	});
	// 	return guardianSubRatePlans;
	// }

	private joinRatePlan(
		subRatePlan: RatePlanWithChargesById,
		zuoraProductRatePlan: CatalogByIdProductRatePlan,
	): JoinedRatePlan {
		const { idToRatePlanCharge, ...restSubRatePlan } = subRatePlan; //idToRatePlanCharge: Record<string, RatePlanCharge>
		const zuoraProductRatePlanCharges: Record<
			string,
			ZuoraProductRatePlanCharge
		> = zuoraProductRatePlan.productRatePlanCharges;
		const guardianChargeKeyToSubCharge: Record<string, RatePlanCharge> =
			this.joinCharges(zuoraProductRatePlanCharges, idToRatePlanCharge);
		return { guardianChargeKeyToSubCharge, ...restSubRatePlan };
	}

	private joinCharges(
		zuoraProductRatePlanCharges: Record<string, ZuoraProductRatePlanCharge>,
		idToRatePlanCharge: Record<string, RatePlanCharge>,
	): Record<string, RatePlanCharge> {
		const zuoraChargeAndSubCharges = objectJoin(
			zuoraProductRatePlanCharges,
			idToRatePlanCharge,
		);
		const guardianChargeKeyToSubCharge = objectFromEntries(
			zuoraChargeAndSubCharges.map(([zuoraCharge, subCharge]) => {
				const guardianChargeKey = getProductRatePlanChargeKey(zuoraCharge.name);
				return [guardianChargeKey, subCharge];
			}),
		);
		return guardianChargeKeyToSubCharge;
	}
}
