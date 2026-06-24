// import type { subscriptionWithRatePlansSchema } from '@modules/zuora/objectQuery/expandSchemas/subscriptionItemSchema';
// import type { z } from 'zod';
// import type { RatePlansBeforeCharges } from '../joinProductsAndRatePlans';
//
// export type MmaZuoraSubscription = z.infer<
// 	typeof subscriptionWithRatePlansSchema
// >;
// export type MmaZuoraRatePlan = MmaZuoraSubscription['ratePlans'][number];
//
// export type MmaSubscriptionWithoutRatePlans = Omit<
// 	MmaZuoraSubscription,
// 	'ratePlans'
// >;
//
// /**
//  * Mirrors GuardianSubscriptionMultiPlan for the MMA/object-query path, only the
//  * rate plans stop at the "before charges" stage (the MMA path never joins charges).
//  *
//  * See guardianSubscriptionParser.ts for the charge-rich equivalent.
//  */
// export type MmaGuardianSubscriptionMultiPlan = MmaSubscriptionWithoutRatePlans &
// 	RatePlansBeforeCharges<MmaZuoraRatePlan>;
