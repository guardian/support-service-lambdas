import {
	groupCollectByUniqueOrThrowMap,
	objectJoinBijective,
} from '@modules/mapFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { mapValue, objectFromEntries } from '@modules/objectFunctions';
import type {
	Product,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	type ProductCatalog,
	ProductCatalogHelper,
	type ProductRatePlanChargeKey,
} from '@modules/product-catalog/productCatalog';
import { zuoraCatalogToProductRatePlanChargeKey } from '@modules/product-catalog/zuoraToProductNameMappings';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { ZuoraProductRatePlanCharge } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductRatePlanChargeIdMap } from '../group/buildZuoraProductIdToKey';
import type {
	IndexedZuoraSubscriptionRatePlanCharges,
	RatePlanWithoutCharges,
	ZuoraRatePlanWithIndexedCharges,
} from '../group/groupSubscriptionByZuoraCatalogIds';

export type GuardianRatePlanMap<P extends ProductKey = ProductKey> =
	GuardianCatalogValuesMap<P> & RatePlanWithoutCharges;

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GuardianCatalogValuesR<P> & RatePlanWithoutCharges;

/**
 * this converts the Map based charges (which are more type safe when processing)
 * to the Record based ones (which are better for using)
 * @param ratePlan
 */
export function convertChargesMapToRecord(
	ratePlan: GuardianRatePlanMap,
): GuardianRatePlan {
	return mapValue(
		ratePlan,
		'ratePlanCharges',
		(c) =>
			objectFromEntries([...c.entries()]) satisfies Record<
				ProductRatePlanChargeKey<ProductKey, ProductRatePlanKey<ProductKey>>,
				RatePlanCharge
			>,
	);
}

/**
 * this is what we attach to the rate plans in place of zuora's basic rate plans array.
 *
 * this type looks convoluted, but it means that if we use an if or switch statement
 * to narrow down the product key and rate plan key, we can access the charges
 * by key rather than filtering them.  Also the product and productRatePlan are
 * correctly typed for the product.
 */
export type GuardianCatalogValuesMap<P extends ProductKey = ProductKey> = {
	[K in P]: {
		[RPK in ProductRatePlanKey<K>]: {
			productKey: K;
			product: ProductWithoutRatePlans<K>;
			productRatePlanKey: RPK;
			productRatePlan: ProductRatePlanWithoutCharges<K, RPK>;
			ratePlanCharges: Map<ProductRatePlanChargeKey<K, RPK>, RatePlanCharge>;
		};
	}[ProductRatePlanKey<K>];
}[P];

/**
 * this is what we attach to the rate plans in place of zuora's basic rate plans array.
 *
 * this type looks convoluted, but it means that if we use an if or switch statement
 * to narrow down the product key and rate plan key, we can access the charges
 * by key rather than filtering them.  Also the product and productRatePlan are
 * correctly typed for the product.
 *
 * 	if (
 * 		ratePlan.productKey === 'SupporterPlus' &&
 * 		ratePlan.productRatePlanKey === 'Monthly'
 * 	) {
 * 		const a = ratePlan.product.customerFacingName;
 * 		const b = ratePlan.productRatePlan.pricing.NZD; // NZD doesn't exist for all products
 * 		const c = ratePlan.ratePlanCharges.Contribution.price; // Contribution exists on Monthly (but not all) S+
 * 	}
 *
 * 	if (
 * 		ratePlan.productKey === 'SupporterPlus' &&
 * 		(ratePlan.productRatePlanKey === 'Monthly' ||
 * 			ratePlan.productRatePlanKey === 'Annual')
 * 	) {
 * 		const d = ratePlan.product.customerFacingName;
 * 		const e = ratePlan.productRatePlan.pricing.AUD;
 * 		const f = ratePlan.ratePlanCharges.Contribution.price; // Contribution exists on Monthly and Annual
 * 	}
 *
 */
export type GuardianCatalogValuesR<P extends ProductKey = ProductKey> = {
	[K in P]: {
		[RPK in ProductRatePlanKey<K>]: {
			productKey: K;
			product: ProductWithoutRatePlans<K>;
			productRatePlanKey: RPK;
			productRatePlan: ProductRatePlanWithoutCharges<K, RPK>;
			ratePlanCharges: Record<ProductRatePlanChargeKey<K, RPK>, RatePlanCharge>;
		};
	}[ProductRatePlanKey<K>];
}[P];

type ProductWithoutRatePlans<P extends ProductKey> = Omit<
	Product<P>,
	'ratePlans'
>;

type ProductRatePlanWithoutCharges<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> = Omit<ProductRatePlan<P, PRP>, 'charges'>;

/**
 * this gathers the relevant objects from the product catalog and builds a
 * combined rate plan and charge tree of the right type
 */
export class GuardianRatePlanBuilder<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
> {
	private productWithoutRatePlans: ProductWithoutRatePlans<P>;
	private productRatePlanWithoutCharges: ProductRatePlanWithoutCharges<P, PRP>;
	private productCatalogHelper: ProductCatalogHelper;

	constructor(
		private productCatalog: ProductCatalog,
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
		private productKey: P,
		private productRatePlanKey: PRP,
	) {
		this.productCatalogHelper = new ProductCatalogHelper(this.productCatalog);
		const { productWithoutRatePlans, productRatePlanWithoutCharges } =
			this.getProductAndRatePlanData(productKey, productRatePlanKey);
		this.productWithoutRatePlans = productWithoutRatePlans;
		this.productRatePlanWithoutCharges = productRatePlanWithoutCharges;
	}

	/**
	 * extracts the product and rateplan from the product catalog so we can embed
	 * them into the subscription rate plan
	 */
	private getProductAndRatePlanData(productKey: P, productRatePlanKey: PRP) {
		const product: Product<P> = this.productCatalog[productKey];
		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just discarded an omitted variable
		const { ratePlans: _unused1, ...productWithoutRatePlans } = product;
		const productRatePlan = this.productCatalogHelper.getProductRatePlan(
			productKey,
			productRatePlanKey,
		);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars -- discard an omitted variable
		const { charges: _unused2, ...productRatePlanWithoutCharges } =
			productRatePlan;
		return { productWithoutRatePlans, productRatePlanWithoutCharges };
	}

	/**
	 * given that the product and rateplan are in the product catalog, return a modified rate plan object
	 * that contains the product-catalog keys and values, as well as the charges keyed as per the product
	 * catalog.
	 */
	buildGuardianRatePlans(
		subscriptionRatePlansForProductRatePlan: readonly ZuoraRatePlanWithIndexedCharges[],
	): Array<GuardianRatePlanMap<P>> {
		return subscriptionRatePlansForProductRatePlan.map(
			(zuoraSubscriptionRatePlan: ZuoraRatePlanWithIndexedCharges) =>
				this.buildGuardianRatePlan(zuoraSubscriptionRatePlan),
		);
	}

	private buildGuardianRatePlan(
		zuoraSubscriptionRatePlan: ZuoraRatePlanWithIndexedCharges,
	): GuardianRatePlanMap<P> {
		return {
			...mapValue(
				zuoraSubscriptionRatePlan,
				'ratePlanCharges',
				(ratePlanCharges) => this.buildGuardianRatePlanCharges(ratePlanCharges),
			),
			productKey: this.productKey,
			product: this.productWithoutRatePlans,
			productRatePlanKey: this.productRatePlanKey,
			productRatePlan: this.productRatePlanWithoutCharges,
		};
	}

	private buildGuardianRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
	): Map<ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>, RatePlanCharge> {
		return groupCollectByUniqueOrThrowMap(
			objectJoinBijective(
				this.productRatePlanCharges,
				zuoraSubscriptionRatePlanCharges,
			),
			([zuoraProductRatePlanCharge, subCharge]: [
				ZuoraProductRatePlanCharge,
				RatePlanCharge,
			]) => {
				return this.buildRatePlanChargeEntry(
					subCharge,
					zuoraProductRatePlanCharge,
				);
			},
			'duplicate rate plan charge keys',
		);
	}

	private buildRatePlanChargeEntry = (
		subCharge: RatePlanCharge,
		zuoraProductRatePlanCharge: ZuoraProductRatePlanCharge,
	): [ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>, RatePlanCharge] => {
		const chargeKey: ProductRatePlanChargeKey<
			P,
			ProductRatePlanKey<P>
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- missing type from underlying record type
		> = getIfDefined(
			zuoraCatalogToProductRatePlanChargeKey[zuoraProductRatePlanCharge.name],
			'some charges of this product are missing from the product-catalog keys lookup',
		) as ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>;
		return [chargeKey, subCharge];
	};
}
