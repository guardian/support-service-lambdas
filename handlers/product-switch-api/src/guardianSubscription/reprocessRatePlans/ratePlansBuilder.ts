// import {
// 	groupCollectByUniqueOrThrowMap,
// 	objectJoinBijective,
// } from '@modules/mapFunctions';
// import type { RatePlanCharge } from '@modules/zuora/types';
// import type { ZuoraProductRatePlanCharge } from '@modules/zuora-catalog/zuoraCatalogSchema';
// import type { ZuoraProductRatePlanChargeIdMap } from '../group/buildZuoraProductIdToKey';
// import type {
// 	IndexedZuoraSubscriptionRatePlanCharges,
// 	RatePlanWithoutCharges,
// 	ZuoraRatePlanWithIndexedCharges,
// } from '../group/groupSubscriptionByZuoraCatalogIds';
//
// export type GenericRatePlan<
// 	ExtraFields,
// 	K,
// 	ChargeType extends RatePlanCharge,
// > = RatePlanWithoutCharges & {
// 	ratePlanCharges: Map<K, ChargeType>;
// } & ExtraFields;
//
// /**
//  * this class handles reprocessing a rate plan and its charges to remove the standard charges field
//  * and replace with appropriate catalog specific fields.
//  */
// export class RatePlansBuilder<
// 	ExtraFields,
// 	K,
// 	ChargeType extends RatePlanCharge,
// > {
// 	constructor(
// 		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
// 		private buildRatePlan: (
// 			rp: RatePlanWithoutCharges,
// 			chargesByKey: Map<K, ChargeType>,
// 		) => GenericRatePlan<ExtraFields, K, ChargeType>,
// 		private buildRatePlanChargeEntry: (
// 			s: RatePlanCharge,
// 			c: ZuoraProductRatePlanCharge,
// 		) => readonly [K, ChargeType],
// 	) {}
//
// 	buildGenericRatePlans(
// 		zuoraSubscriptionRatePlans: readonly ZuoraRatePlanWithIndexedCharges[],
// 	): Array<GenericRatePlan<ExtraFields, K, ChargeType>> {
// 		return zuoraSubscriptionRatePlans.map(
// 			(zuoraSubscriptionRatePlan: ZuoraRatePlanWithIndexedCharges) => {
// 				const { ratePlanCharges, ...ratePlanWithoutCharges } =
// 					zuoraSubscriptionRatePlan;
//
// 				const chargesByKey: Map<K, ChargeType> =
// 					this.buildGuardianRatePlanCharges(ratePlanCharges);
//
// 				return this.buildRatePlan(
// 					ratePlanWithoutCharges,
// 					chargesByKey,
// 				) satisfies GenericRatePlan<ExtraFields, K, ChargeType>;
// 			},
// 		);
// 	}
//
// 	private buildGuardianRatePlanCharges(
// 		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
// 	): Map<K, ChargeType> {
// 		return groupCollectByUniqueOrThrowMap(
// 			objectJoinBijective(
// 				this.productRatePlanCharges,
// 				zuoraSubscriptionRatePlanCharges,
// 			),
// 			([zuoraProductRatePlanCharge, subCharge]: [
// 				ZuoraProductRatePlanCharge,
// 				RatePlanCharge,
// 			]) => {
// 				return this.buildRatePlanChargeEntry(
// 					subCharge,
// 					zuoraProductRatePlanCharge,
// 				);
// 			},
// 			'duplicate rate plan charge keys',
// 		);
// 	}
// }
