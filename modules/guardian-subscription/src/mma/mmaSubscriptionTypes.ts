import type { subscriptionWithRatePlansSchema } from '@modules/zuora/objectQuery/expandSchemas/subscriptionItemSchema';
import type { z } from 'zod';
import type { RatePlansBeforeCharges } from '../joinProductsAndRatePlans';
import type { GuardianRatePlanBeforeCharges } from '../reprocessRatePlans/guardianRatePlanBuilder';
import type { ZuoraRatePlanBeforeCharges } from '../reprocessRatePlans/zuoraRatePlanBuilder';

export type MmaZuoraSubscription = z.infer<
	typeof subscriptionWithRatePlansSchema
>;
export type MmaZuoraRatePlan = MmaZuoraSubscription['ratePlans'][number];

export type MmaSubscriptionWithoutRatePlans = Omit<
	MmaZuoraSubscription,
	'ratePlans'
>;

/**
 * A product-catalog rate plan in the MMA path.
 *
 * This is the shared "before charges" rate plan, since the MMA path never
 * fetches the subscription charges - so the carried productCatalogCharges stays
 * attached and unused (useful later if/when we do fetch the charges).
 */
export type MmaGuardianRatePlan =
	GuardianRatePlanBeforeCharges<MmaZuoraRatePlan>;

/**
 * A rate plan that is not in the product catalog (e.g. Discounts) in the MMA path.
 *
 * As above, this is the shared "before charges" non-catalog rate plan.
 */
export type MmaRatePlanNotInCatalog =
	ZuoraRatePlanBeforeCharges<MmaZuoraRatePlan>;

/**
 * Mirrors GuardianSubscriptionMultiPlan for the MMA/object-query path, only the
 * rate plans stop at the "before charges" stage (the MMA path never joins charges).
 *
 * See guardianSubscriptionParser.ts for the charge-rich equivalent.
 */
export type MmaGuardianSubscriptionMultiPlan = MmaSubscriptionWithoutRatePlans &
	RatePlansBeforeCharges<MmaZuoraRatePlan>;
