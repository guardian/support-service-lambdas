import {
	groupCollectByUniqueOrThrowMap,
	objectJoinBijective,
} from '@modules/mapFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectFromEntries } from '@modules/objectFunctions';
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

/**
 * There is a similar type only one with the charges as a Record and the other
 * as a Map.  This is because Record is more native and easier to use, but it
 * doesn't provide any type safety on the keys.  So Map is used internally to
 * ensure errors are not made, and Record is used in the user code for
 * convenience.
 */
export type GuardianRatePlanMap<P extends ProductKey = ProductKey> =
	GuardianCatalogValuesMap<P> & RatePlanWithoutCharges;

export type GuardianRatePlan<P extends ProductKey = ProductKey> =
	GuardianCatalogValuesRecord<P> & RatePlanWithoutCharges;

/**
 * this converts the Map based charges (which are more type safe when processing)
 * to the Record based ones (which are better for using)
 * @param ratePlan
 */
export function convertChargesMapToRecord(
	ratePlan: GuardianRatePlanMap,
): GuardianRatePlan {
	return {
		...ratePlan,
		ratePlanCharges: objectFromEntries([
			...ratePlan.ratePlanCharges.entries(),
		]) satisfies Record<
			ProductRatePlanChargeKey<ProductKey, ProductRatePlanKey<ProductKey>>,
			RatePlanCharge
		>,
	};
}

/**
 * this is what we attach to the rate plans in place of zuora's basic rate plans array.
 *
 * this type looks convoluted, but it means that if we use an if or switch statement
 * to narrow down the product key and rate plan key, we can access the charges
 * by key rather than filtering them.  Also the product and productRatePlan are
 * correctly typed for the product.
 *
 * There is a similar type only one with the charges as a Record and the other
 * as a Map.  This is because Record is more native and easier to use, but it
 * doesn't provide any type safety on the keys.  So Map is used internally to
 * ensure errors are not made, and Record is used in the user code for
 * convenience.
 */
type GuardianCatalogValuesMap<P extends ProductKey = ProductKey> = {
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
 * There is a similar type only one with the charges as a Record and the other
 * as a Map.  This is because Record is more native and easier to use, but it
 * doesn't provide any type safety on the keys.  So Map is used internally to
 * ensure errors are not made, and Record is used in the user code for
 * convenience.
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
type GuardianCatalogValuesRecord<P extends ProductKey = ProductKey> = {
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
 * this is what we attach to the rate plans once the products and rate plans have
 * been joined, but before the charges have been joined.
 *
 * It mirrors GuardianCatalogValuesMap, only the final typed ratePlanCharges is
 * replaced by productCatalogCharges (the catalog charge id lookup). This is
 * carried for the later "join the charges" pass (joinGuardianRatePlanCharges),
 * or simply left attached and unused for the MMA path which never fetches the
 * subscription charges.
 */
type GuardianCatalogValuesBeforeCharges<P extends ProductKey = ProductKey> = {
	[K in P]: {
		[RPK in ProductRatePlanKey<K>]: {
			productKey: K;
			product: ProductWithoutRatePlans<K>;
			productRatePlanKey: RPK;
			productRatePlan: ProductRatePlanWithoutCharges<K, RPK>;
			productCatalogCharges: ZuoraProductRatePlanChargeIdMap;
		};
	}[ProductRatePlanKey<K>];
}[P];

/**
 * A product-catalog rate plan after joining the catalog product/rateplan but
 * before joining the charges.
 *
 * Generic over the subscription rate plan type so it works for both the
 * charge-rich (full) path and the MMA (no charges) path.
 */
export type GuardianRatePlanBeforeCharges<
	SubRP = RatePlanWithoutCharges,
	P extends ProductKey = ProductKey,
> = SubRP & GuardianCatalogValuesBeforeCharges<P>;

/**
 * this gathers the relevant objects from the product catalog and joins the
 * product and rate plan onto each subscription rate plan.
 *
 * This is the "join the products and rate plans" pass: it does not touch the
 * charges, it only carries the catalog charge lookup (productCatalogCharges)
 * along for the later "join the charges" pass.
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
		private productCatalogCharges: ZuoraProductRatePlanChargeIdMap,
		private productKey: P,
		private productRatePlanKey: PRP,
	) {
		this.productCatalogHelper = new ProductCatalogHelper(this.productCatalog);
		const { productWithoutRatePlans, productRatePlanWithoutCharges } =
			this.getProductAndRatePlanData();
		this.productWithoutRatePlans = productWithoutRatePlans;
		this.productRatePlanWithoutCharges = productRatePlanWithoutCharges;
	}

	/**
	 * extracts the product and rateplan from the product catalog so we can embed
	 * them into the subscription rate plan
	 */
	private getProductAndRatePlanData() {
		const product: Product<P> = this.productCatalog[this.productKey];
		const { ratePlans: _unused1, ...productWithoutRatePlans } = product;
		const productRatePlan: ProductRatePlan<P, PRP> =
			this.productCatalogHelper.getProductRatePlan(
				this.productKey,
				this.productRatePlanKey,
			);

		const { charges: _unused2, ...productRatePlanWithoutCharges } =
			productRatePlan;
		return { productWithoutRatePlans, productRatePlanWithoutCharges };
	}

	/**
	 * join the catalog product/rateplan onto each subscription rate plan, carrying
	 * the catalog charge lookup along for the later charge join.
	 */
	joinProductAndRatePlans<SubRP>(
		subscriptionRatePlansForProductRatePlan: readonly SubRP[],
	): Array<GuardianRatePlanBeforeCharges<SubRP, P>> {
		return subscriptionRatePlansForProductRatePlan.map((subRatePlan) => ({
			...subRatePlan,
			productKey: this.productKey,
			product: this.productWithoutRatePlans,
			productRatePlanKey: this.productRatePlanKey,
			productRatePlan: this.productRatePlanWithoutCharges,
			productCatalogCharges: this.productCatalogCharges,
		}));
	}
}

/**
 * the "join the charges" pass for a product-catalog rate plan.
 *
 * joins the carried catalog charges (productCatalogCharges) with the
 * subscription charges (ratePlanCharges) to produce the final rate plan with
 * charges keyed by the product-catalog charge key.
 */
export function joinGuardianRatePlanCharges<P extends ProductKey>(
	ratePlan: GuardianRatePlanBeforeCharges<ZuoraRatePlanWithIndexedCharges, P>,
): GuardianRatePlanMap<P> {
	const { productCatalogCharges, ratePlanCharges, ...rest } = ratePlan;
	return {
		...rest,
		ratePlanCharges: buildGuardianRatePlanCharges<P>(
			productCatalogCharges,
			ratePlanCharges,
		),
	};
}

function buildGuardianRatePlanCharges<P extends ProductKey>(
	productCatalogCharges: ZuoraProductRatePlanChargeIdMap,
	subscriptionCharges: IndexedZuoraSubscriptionRatePlanCharges,
): Map<ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>, RatePlanCharge> {
	return groupCollectByUniqueOrThrowMap(
		objectJoinBijective(productCatalogCharges, subscriptionCharges),
		([zuoraProductRatePlanCharge, subCharge]: [
			ZuoraProductRatePlanCharge,
			RatePlanCharge,
		]) => buildRatePlanChargeEntry<P>(subCharge, zuoraProductRatePlanCharge),
		'duplicate rate plan charge keys',
	);
}

function buildRatePlanChargeEntry<P extends ProductKey>(
	subCharge: RatePlanCharge,
	zuoraProductRatePlanCharge: ZuoraProductRatePlanCharge,
): [ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>, RatePlanCharge] {
	const chargeKey: ProductRatePlanChargeKey<
		P,
		ProductRatePlanKey<P>
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- missing type from underlying record type
	> = getIfDefined(
		zuoraCatalogToProductRatePlanChargeKey[zuoraProductRatePlanCharge.name],
		'some charges of this product are missing from the product-catalog keys lookup',
	) as ProductRatePlanChargeKey<P, ProductRatePlanKey<P>>;
	return [chargeKey, subCharge];
}
