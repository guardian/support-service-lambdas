import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import type { ZuoraCatalog } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductIdMap } from '../group/buildZuoraProductIdToKey';
import { buildZuoraProductIdToKey } from '../group/buildZuoraProductIdToKey';
import { joinProductsAndRatePlans } from '../joinProductsAndRatePlans';
import { groupMmaSubscriptionByIds } from './groupMmaSubscriptionByZuoraCatalogIds';
import type {
	MmaGuardianSubscriptionMultiPlan,
	MmaZuoraSubscription,
} from './mmaSubscriptionTypes';

/**
 * MMA/object-query equivalent of GuardianSubscriptionParser.
 *
 * Takes a subscription from the object-query API (subscriptions.rateplans expand,
 * no charges) and converts it to a product-catalog-keyed structure.
 *
 * It shares the "join the products and rate plans" pass with
 * GuardianSubscriptionParser (see joinProductsAndRatePlans). The only difference
 * is that this path has no subscription charges, so it stops there - it never
 * runs the "join the charges" pass. The carried catalog charge lookups stay
 * attached and unused, ready for later if/when we do fetch the charges.
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
	 * attach all subscription and catalog products together and process the
	 * combination, merging the results.
	 *
	 * Mirrors GuardianSubscriptionParser.toGuardianSubscription, only without the
	 * "join the charges" pass.
	 */
	toGuardianSubscription(
		zuoraSubscription: MmaZuoraSubscription,
	): MmaGuardianSubscriptionMultiPlan {
		const { products, ...subscriptionWithoutRatePlans } =
			groupMmaSubscriptionByIds(zuoraSubscription);

		return {
			...subscriptionWithoutRatePlans,
			...joinProductsAndRatePlans(
				products,
				this.zuoraProductIdGuardianLookup,
				this.productCatalog,
			),
		};
	}
}
