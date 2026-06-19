import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type {
	CatalogProduct,
	ZuoraCatalog,
} from '@modules/zuora-catalog/zuoraCatalogSchema';
import { getGuardianKeysFromZuoraNames } from '../getGuardianKeysFromZuoraNames';
import type {
	ZuoraProductIdMap,
	ZuoraProductRatePlanNode,
} from '../group/buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from '../group/buildZuoraProductIdToKey';
import { joinFlatMap } from '../group/joinFlatMap';
import { groupMmaSubscriptionByIds } from './groupMmaSubscriptionByZuoraCatalogIds';
import type {
	MmaGuardianRatePlan,
	MmaGuardianSubscriptionMultiPlan,
	MmaRatePlanNotInCatalog,
	MmaZuoraRatePlan,
	MmaZuoraSubscription,
} from './mmaSubscriptionTypes';

/**
 * This represents what extra info we attach to the subscription to make an MMA
 * guardian subscription — mirrors RatePlansWithCatalogData in guardianSubscriptionParser.ts.
 * Unlike the charge-rich equivalent, rate plans carry no ratePlanCharges.
 */
type MmaRatePlansWithCatalogData = {
	ratePlans: MmaGuardianRatePlan[];
	productsNotInCatalog: MmaRatePlanNotInCatalog[];
};

/**
 * MMA/object-query equivalent of GuardianSubscriptionParser.
 *
 * Takes a subscription from the object-query API (subscriptions.rateplans expand,
 * no charges) and converts it to a product-catalog-keyed structure.
 *
 * Mirrors the structure of GuardianSubscriptionParser in guardianSubscriptionParser.ts.
 * The key difference is that there are no ratePlanCharges to process, so the
 * rate plans are lighter and the indexing step (indexTheCharges) is omitted.
 *
 * Rate plans are split into:
 * - ratePlans: known product catalog plans (all amendment types retained — history
 *   and discount splitting happens in the filter/flatten steps)
 * - productsNotInCatalog: unknown plans, enriched with product and productRatePlan
 *   from the Zuora catalog so later pipeline steps can identify discounts without
 *   re-querying the catalog
 */
export class MmaGuardianSubscriptionParser {
	private zuoraProductIdGuardianLookup: ZuoraProductIdMap;

	constructor(
		catalog: ZuoraCatalog,
		private productCatalog: ProductCatalog,
	) {
		this.zuoraProductIdGuardianLookup = buildZuoraProductIdToKey(catalog);
	}

	/**
	 * Attach all subscription and catalog products together and process the
	 * combination, merging the results.
	 *
	 * Mirrors GuardianSubscriptionParser.toGuardianSubscription.
	 */
	toGuardianSubscription(
		zuoraSubscription: MmaZuoraSubscription,
	): MmaGuardianSubscriptionMultiPlan {
		const { products, ...subscriptionWithoutRatePlans } =
			groupMmaSubscriptionByIds(zuoraSubscription);

		// we join and then flatten both the product and rateplan levels to avoid undue nesting
		const guardianRatePlans: MmaRatePlansWithCatalogData = joinFlatMap(
			products,
			this.zuoraProductIdGuardianLookup,
			(ratePlansById, { zuoraProduct, productRatePlans }) =>
				joinFlatMap(
					ratePlansById,
					productRatePlans,
					(ratePlansForId, productRatePlanNode) =>
						this.buildRatePlansWithCatalogData(
							ratePlansForId,
							productRatePlanNode,
							zuoraProduct,
						),
				),
		);

		return {
			...subscriptionWithoutRatePlans,
			...guardianRatePlans,
		};
	}

	/**
	 * For a rate plan under a given product, check if the product is known by
	 * the product catalog.
	 *
	 * If so, add it to ratePlans with guardian keys attached.
	 * If not, add it to productsNotInCatalog with product and productRatePlan
	 * attached (e.g. for 'Discounts') for later identification.
	 *
	 * Mirrors GuardianSubscriptionParser.buildRatePlansWithCatalogData.
	 * Unlike the charge-rich equivalent, no charge joining is performed and
	 * ZuoraRatePlanBuilder is not used — we strip the charges fields directly.
	 * Discount and RemoveProduct classification is deferred to filter/flatten steps.
	 */
	private buildRatePlansWithCatalogData(
		subscriptionRatePlansForProductRatePlan: readonly MmaZuoraRatePlan[],
		productRatePlanNode: ZuoraProductRatePlanNode,
		zuoraProduct: CatalogProduct,
	): MmaRatePlansWithCatalogData {
		const maybeGuardianKeys = getGuardianKeysFromZuoraNames(
			this.productCatalog,
			zuoraProduct.name,
			productRatePlanNode.zuoraProductRatePlan.name,
		);

		if (maybeGuardianKeys === undefined) {
			// not in product catalog — attach product and productRatePlan for later identification
			// mirrors ZuoraCatalogValues in zuoraRatePlanBuilder.ts, minus ratePlanCharges
			const { productRatePlans: _p, ...product } = zuoraProduct;
			const { productRatePlanCharges: _c, ...productRatePlan } =
				productRatePlanNode.zuoraProductRatePlan;
			return {
				ratePlans: [],
				productsNotInCatalog: subscriptionRatePlansForProductRatePlan.map(
					(ratePlan) => ({
						...ratePlan,
						product,
						productRatePlan,
					}),
				),
			};
		}

		return {
			ratePlans: subscriptionRatePlansForProductRatePlan.map((ratePlan) => ({
				...ratePlan,
				productKey: maybeGuardianKeys.productKey,
				productRatePlanKey: maybeGuardianKeys.productRatePlanKey,
			})),
			productsNotInCatalog: [],
		};
	}
}
