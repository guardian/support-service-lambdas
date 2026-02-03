import { groupCollectByUniqueId } from '@modules/arrayFunctions';
import { objectJoinBijective } from '@modules/objectFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { ZuoraProductRatePlanCharge } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { ZuoraProductRatePlanChargeIdMap } from '../group/buildZuoraProductIdToKey';
import type {
	IndexedZuoraRatePlanWithCharges,
	IndexedZuoraSubscriptionRatePlanCharges,
	RestRatePlan,
} from '../group/groupSubscriptionByZuoraCatalogIds';

/**
 * EXTRA represents whatever extra info we attach to the rateplan to make a "guardian" rateplan
 */
export type GenericRatePlan<
	EXTRA extends { ratePlanCharges: Record<string, RatePlanCharge> } = {
		ratePlanCharges: Record<string, RatePlanCharge>;
	},
> = RestRatePlan & EXTRA;

/**
 * this class handles reprocessing a rate plan and its charges to remove the standard charges field
 * and replace with appropriate catalog specific fields.
 */
export class RatePlansBuilder<
	RP extends { ratePlanCharges: Record<string, RatePlanCharge> },
	K extends string,
	RPC,
> {
	constructor(
		private productRatePlanCharges: ZuoraProductRatePlanChargeIdMap,
		private buildRatePlan: (
			rp: RestRatePlan,
			chargesByKey: Record<K, RPC>,
		) => GenericRatePlan<RP>,
		private buildRatePlanChargeEntry: (
			s: RatePlanCharge,
			c: ZuoraProductRatePlanCharge,
		) => readonly [K, RPC],
	) {}

	buildGenericRatePlans(
		zuoraSubscriptionRatePlans: readonly IndexedZuoraRatePlanWithCharges[],
	): Array<GenericRatePlan<RP>> {
		return zuoraSubscriptionRatePlans.map(
			(zuoraSubscriptionRatePlan: IndexedZuoraRatePlanWithCharges) => {
				const { ratePlanCharges, ...restRatePlan } = zuoraSubscriptionRatePlan;

				const chargesByKey: Record<K, RPC> =
					this.buildGuardianRatePlanCharges(ratePlanCharges);

				return this.buildRatePlan(
					restRatePlan,
					chargesByKey,
				) satisfies GenericRatePlan<RP>;
			},
		);
	}

	private buildGuardianRatePlanCharges(
		zuoraSubscriptionRatePlanCharges: IndexedZuoraSubscriptionRatePlanCharges,
	): Record<K, RPC> {
		return groupCollectByUniqueId(
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
}
