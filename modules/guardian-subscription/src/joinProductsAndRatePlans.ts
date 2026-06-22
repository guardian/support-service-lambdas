import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { CatalogProduct } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { getGuardianKeysFromZuoraNames } from './getGuardianKeysFromZuoraNames';
import type {
	ZuoraProductIdMap,
	ZuoraProductRatePlanNode,
} from './group/buildZuoraProductIdToKey';
import type { IndexedRatePlansByProduct } from './group/byProductAndRatePlanIds';
import { joinFlatMap } from './group/joinFlatMap';
import type { GuardianRatePlanBeforeCharges } from './reprocessRatePlans/guardianRatePlanBuilder';
import { GuardianRatePlanBuilder } from './reprocessRatePlans/guardianRatePlanBuilder';
import type { ZuoraRatePlanBeforeCharges } from './reprocessRatePlans/zuoraRatePlanBuilder';
import { ZuoraRatePlanBuilder } from './reprocessRatePlans/zuoraRatePlanBuilder';

/**
 * The rate plans of a subscription after the products and rate plans have been
 * joined to the catalog, but before the charges have been joined.
 *
 * - ratePlans: known product-catalog plans (all amendment types retained)
 * - productsNotInCatalog: unknown plans (e.g. Discounts)
 *
 * Both buckets carry the catalog charge lookup (productCatalogCharges) so the
 * charges can be joined later (full path) or left unused (MMA path).
 */
export type RatePlansBeforeCharges<SubRP> = {
	ratePlans: Array<GuardianRatePlanBeforeCharges<SubRP>>;
	productsNotInCatalog: Array<ZuoraRatePlanBeforeCharges<SubRP>>;
};

/**
 * the shared "join the products and rate plans" pass used by both the full and
 * MMA paths of GuardianSubscriptionParser (toGuardianSubscription and
 * toMmaGuardianSubscription).
 *
 * It joins the subscription rate plans (already grouped by product*Id) to the
 * Zuora catalog, splitting them into known/unknown product-catalog plans and
 * attaching the catalog product/rateplan plus the carried catalog charge lookup.
 *
 * It is generic over the subscription rate plan type, so it works whether or not
 * the rate plans carry charges - the charges are not touched here.
 */
export function joinProductsAndRatePlans<SubRP>(
	products: IndexedRatePlansByProduct<SubRP>,
	zuoraProductIdGuardianLookup: ZuoraProductIdMap,
	productCatalog: ProductCatalog,
): RatePlansBeforeCharges<SubRP> {
	// we join and then flatten both the product and rateplan levels to avoid undue nesting
	return joinFlatMap(
		products,
		zuoraProductIdGuardianLookup,
		(ratePlansById, { zuoraProduct, productRatePlans }) =>
			joinFlatMap(
				ratePlansById,
				productRatePlans,
				(ratePlansForId, productRatePlanNode) =>
					buildRatePlansBeforeCharges(
						ratePlansForId,
						productRatePlanNode,
						zuoraProduct,
						productCatalog,
					),
			),
	);
}

/**
 * for a rate plan that is under a given product, check if the product is known
 * by the product-catalog.
 *
 * If so then attach the catalog product/rateplan/keys (ratePlans), otherwise
 * attach the basic zuora catalog product/rateplan (productsNotInCatalog).
 */
function buildRatePlansBeforeCharges<SubRP>(
	subscriptionRatePlansForProductRatePlan: readonly SubRP[],
	productRatePlanNode: ZuoraProductRatePlanNode,
	zuoraProduct: CatalogProduct,
	productCatalog: ProductCatalog,
): RatePlansBeforeCharges<SubRP> {
	const maybeGuardianKeys = getGuardianKeysFromZuoraNames(
		productCatalog,
		zuoraProduct.name,
		productRatePlanNode.zuoraProductRatePlan.name,
	);

	if (maybeGuardianKeys === undefined) {
		// not in product catalog - attach to zuora catalog instead
		const zuoraRatePlanBuilder = new ZuoraRatePlanBuilder(
			zuoraProduct,
			productRatePlanNode,
		);
		return {
			ratePlans: [],
			productsNotInCatalog: zuoraRatePlanBuilder.joinProductAndRatePlans(
				subscriptionRatePlansForProductRatePlan,
			),
		};
	}

	const guardianRatePlanBuilder = new GuardianRatePlanBuilder(
		productCatalog,
		productRatePlanNode.productRatePlanCharges,
		maybeGuardianKeys.productKey,
		maybeGuardianKeys.productRatePlanKey,
	);
	return {
		ratePlans: guardianRatePlanBuilder.joinProductAndRatePlans(
			subscriptionRatePlansForProductRatePlan,
		),
		productsNotInCatalog: [],
	};
}
