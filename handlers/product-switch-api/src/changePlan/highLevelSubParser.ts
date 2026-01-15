import {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
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

type ZuoraProductRatePlanByIds = {
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
type ZuoraCatalogByProductIds = Record<
	string, // product id
	{
		id: string;
		name: string;
		description: string;
		effectiveStartDate: string;
		effectiveEndDate: string;
		productRatePlans: Record<
			string, // product rate plan id
			ZuoraProductRatePlanByIds
		>;
	}
>;

type RestRatePlan = Omit<RatePlan, 'ratePlanCharges'>;

type RestSubscription = Omit<ZuoraSubscription, 'ratePlans'>;

//zuora
// RP
type ZuoraRatePlanWithChargesByPRPCId = RestRatePlan & {
	zuoraRatePlanChargesByProductRatePlanChargeId: Record<
		string, // product rate plan charge id
		RatePlanCharge
	>;
};

//Sub
type ZuoraRatePlansByPRPId = Record<
	string, // product rate plan id
	ZuoraRatePlanWithChargesByPRPCId[] // might have multiple of the same product, e.g. product switch and back again
>;

type ZuoraSubscriptionWithProductsByPId = RestSubscription & {
	zuoraProductsByProductId: Record<
		string, // product id
		ZuoraRatePlansByPRPId
	>;
};

// guardian
export type GuardianRatePlan = {
	guardianRatePlanCharges: Record<
		string, // guardian rate plan key e.g. 'Annual' or 'OneYearStudent'
		RatePlanCharge // is technically the zuora charge but we don't need to touch it
	>;
} & RestRatePlan;

export type GuardianSubscription = {
	guardianProducts: {
		[P in ProductKey]: Record<ProductRatePlanKey<P>, GuardianRatePlan[]>;
	};
} & RestSubscription;

/**
 * this takes a basic zuora subscription and blends it with product catalog information to
 * return something more meaningful in a guardian context
 *
 * It maintains all current and historical plans and charges
 */
export class HighLevelSubParser {
	private catalogByProductIds: ZuoraCatalogByProductIds;
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
	private buildCatalogByIds(catalog: ZuoraCatalog): ZuoraCatalogByProductIds {
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
	): ZuoraSubscriptionWithProductsByPId {
		const { ratePlans, ...restSubscription } = subscription;
		const productIdProductRatePlanIdRatePlanTuple: readonly [
			string,
			readonly [string, ZuoraRatePlanWithChargesByPRPCId],
		][] = ratePlans.map((rp: RatePlan) => {
			const { ratePlanCharges, ...restRatePlan } = rp;
			const idToRatePlanCharge: Record<string, RatePlanCharge> =
				objectFromEntries(
					ratePlanCharges.map((rpc: RatePlanCharge) => [
						rpc.productRatePlanChargeId,
						rpc,
					]),
				);
			const ratePlanWithChargesById: ZuoraRatePlanWithChargesByPRPCId = {
				...restRatePlan,
				zuoraRatePlanChargesByProductRatePlanChargeId: idToRatePlanCharge,
			};
			return [
				rp.productId,
				[rp.productRatePlanId, ratePlanWithChargesById] as const,
			] as const;
		});
		const byProduct: Record<
			string,
			(readonly [string, ZuoraRatePlanWithChargesByPRPCId])[]
		> = groupMap(
			productIdProductRatePlanIdRatePlanTuple,
			([productId]) => productId,
			([, productRatePlanMap]) => productRatePlanMap,
		);
		const products: Record<string, ZuoraRatePlansByPRPId> = mapValues(
			byProduct,
			(productRatePlanMap) =>
				groupMap(
					productRatePlanMap,
					([productRatePlanId]) => productRatePlanId,
					([, productRatePlanChargeMap]) => productRatePlanChargeMap,
				),
		);
		return {
			...restSubscription,
			zuoraProductsByProductId: products,
		};
	}

	asHighLevelSub(subscription: ZuoraSubscription): GuardianSubscription {
		const subByProductIds: ZuoraSubscriptionWithProductsByPId =
			this.buildSubscriptionByProductIds(subscription);
		const mergedSubscription: GuardianSubscription =
			this.mergeSubscription(subByProductIds);

		return mergedSubscription;
	}
	private mergeSubscription(
		subByProductIds: ZuoraSubscriptionWithProductsByPId,
	) {
		const { zuoraProductsByProductId, ...restSubscription2 } = subByProductIds;
		const joinedByProduct: GuardianSubscription['guardianProducts'] =
			this.joinSubscription(zuoraProductsByProductId);
		const mergedSubscription: GuardianSubscription = {
			guardianProducts: joinedByProduct,
			...restSubscription2,
		};
		return mergedSubscription;
	}

	private joinSubscription(
		zuoraProductsByProductId: Record<string, ZuoraRatePlansByPRPId>,
	) {
		const guardianProductAndSusbcription = objectLeftJoin(
			zuoraProductsByProductId,
			this.catalogByProductIds,
		);
		const joinedByProduct: Record<
			ProductKey,
			Record<string, GuardianRatePlan[]>
		> = objectFromEntries(
			guardianProductAndSusbcription.map(
				([subByProductRatePlanId, zuoraProduct]) => {
					const guardianProductKey = getZuoraProductKey(zuoraProduct.name);

					const zuoraProductRatePlans = zuoraProduct.productRatePlans;
					const guardianSubAAA: Record<string, GuardianRatePlan[]> =
						this.mergeRatePlans(zuoraProductRatePlans, subByProductRatePlanId);
					return [guardianProductKey, guardianSubAAA];
				},
			),
		);
		return joinedByProduct;
	}

	private mergeRatePlans(
		zuoraProductRatePlans: Record<string, ZuoraProductRatePlanByIds>,
		subByProductRatePlanId: ZuoraRatePlansByPRPId,
	): Record<string, GuardianRatePlan[]> {
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
					const guardianSubRatePlans: GuardianRatePlan[] = subRatePlans.map(
						(subRatePlan: ZuoraRatePlanWithChargesByPRPCId) => {
							return this.joinRatePlan(subRatePlan, zuoraProductRatePlan);
						},
					);
					return [guardianRatePlanKey, guardianSubRatePlans];
				},
			),
		);
		return guardianSubAAA;
	}

	private joinRatePlan(
		subRatePlan: ZuoraRatePlanWithChargesByPRPCId,
		zuoraProductRatePlan: ZuoraProductRatePlanByIds,
	): GuardianRatePlan {
		const {
			zuoraRatePlanChargesByProductRatePlanChargeId,
			...restSubRatePlan
		} = subRatePlan; //idToRatePlanCharge: Record<string, RatePlanCharge>
		const zuoraProductRatePlanCharges: Record<
			string,
			ZuoraProductRatePlanCharge
		> = zuoraProductRatePlan.productRatePlanCharges;
		const guardianChargeKeyToSubCharge: Record<string, RatePlanCharge> =
			this.joinCharges(
				zuoraProductRatePlanCharges,
				zuoraRatePlanChargesByProductRatePlanChargeId,
			);
		return {
			guardianRatePlanCharges: guardianChargeKeyToSubCharge,
			...restSubRatePlan,
		};
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
