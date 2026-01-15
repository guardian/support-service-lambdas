import { GuardianRatePlan, GuardianSubscription } from './highLevelSubParser';
import { RatePlanCharge } from '@modules/zuora/types';
import dayjs from 'dayjs';
import {
	mapValues,
	partitionByType,
	partitionByValueType,
} from '@modules/arrayFunctions';
import { objectKeys } from '@modules/objectFunctions';
import { ProductKey } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';

/**
 * This lets you iterate through rate plans and charges removing ones that you aren't interested in
 *
 * It provides a useful activeCurrentSubscriptionFilter for when we're only interested
 * in products that are not removed and effective as of today.
 */
export class SubscriptionFilter {
	constructor(
		private ratePlanDiscardReason: (
			rp: GuardianRatePlan, //MergedSubscription['joinedByProduct'][ProductKey][string],
		) => string | undefined,
		private chargeDiscardReason: (rpc: RatePlanCharge) => string | undefined,
	) {}

	/**
	 * this filters out all Removed rate plans and charges outside of their effective dates
	 *
	 * Note: This means that products with pending changes will be filtered out e.g. switch or amount change
	 * @param today
	 */
	static activeCurrentSubscriptionFilter(
		today: dayjs.Dayjs,
	): SubscriptionFilter {
		return new SubscriptionFilter(
			(rp) => (rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined),
			(rpc) =>
				rpc.effectiveStartDate > today.toDate()
					? 'plan has not started'
					: rpc.effectiveEndDate <= today.toDate()
						? 'plan has finished'
						: undefined,
		);
	}

	private filterCharges(charges: Record<string, RatePlanCharge>) {
		const [errors, filteredCharges] = partitionByValueType(
			mapValues(charges, (rpc: RatePlanCharge) => {
				const chargeDiscardReason1 = this.chargeDiscardReason(rpc);
				return chargeDiscardReason1 !== undefined ? chargeDiscardReason1 : rpc;
			}),
			(o) => typeof o === 'string',
		);
		return { errors, filteredCharges };
	}

	private filterRatePlanList(guardianSubRatePlans: GuardianRatePlan[]): {
		discarded: string[];
		ratePlans: GuardianRatePlan[];
	} {
		const [discarded, ratePlans] = partitionByType(
			guardianSubRatePlans.map((rp: GuardianRatePlan) => {
				const maybeDiscardWholePlan = this.ratePlanDiscardReason(rp);
				if (maybeDiscardWholePlan !== undefined) return maybeDiscardWholePlan;

				const { errors, filteredCharges } = this.filterCharges(
					rp.guardianRatePlanCharges,
				);

				const maybeAllChargesDiscarded =
					objectKeys(filteredCharges).length === 0
						? 'all charges discarded: ' + JSON.stringify(errors)
						: undefined;
				if (maybeAllChargesDiscarded !== undefined)
					return maybeAllChargesDiscarded;
				return { ...rp, ratePlanCharges: filteredCharges };
			}),
			(o) => typeof o === 'string',
		);
		return { discarded, ratePlans };
	}

	private filterRatePlans(
		joinedByProduct: Record<ProductKey, Record<string, GuardianRatePlan[]>>,
	): Record<ProductKey, Record<string, GuardianRatePlan[]>> {
		return mapValues(
			joinedByProduct,
			(jbp: Record<string, GuardianRatePlan[]>) =>
				mapValues(jbp, (guardianSubRatePlans: GuardianRatePlan[]) => {
					const { discarded, ratePlans } =
						this.filterRatePlanList(guardianSubRatePlans);
					if (discarded.length > 0)
						logger.log(`discarded rateplans:`, discarded); // could be spammy?
					return ratePlans;
				}),
		);
	}

	filterSubscription(highLevelSub: GuardianSubscription): GuardianSubscription {
		const { guardianProducts, ...restSubscription } = highLevelSub;
		const ratePlans = this.filterRatePlans(guardianProducts);
		return {
			...restSubscription,
			guardianProducts: ratePlans,
		};
	}
}
