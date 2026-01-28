import { mapValues, partitionByType } from '@modules/arrayFunctions';
import {
	mapValue,
	objectKeys,
	partitionObjectByValueType,
} from '@modules/objectFunctions';
import type { ProductKey } from '@modules/product-catalog/productCatalog';
import { logger } from '@modules/routing/logger';
import type { RatePlanCharge } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import type {
	GuardianRatePlan,
	GuardianRatePlans,
	GuardianSubscriptionWithProducts,
} from './guardianSubscriptionParser';

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
				dayjs(rpc.effectiveStartDate).isBefore(today) ||
				dayjs(rpc.effectiveStartDate).isSame(today)
					? dayjs(rpc.effectiveEndDate).isAfter(today)
						? undefined
						: `plan has finished: today: ${zuoraDateFormat(today)} >= end: ${zuoraDateFormat(dayjs(rpc.effectiveEndDate))}`
					: `plan has not started: today: ${zuoraDateFormat(today)} < start: ${zuoraDateFormat(dayjs(rpc.effectiveStartDate))}`,
		);
	}

	/**
	 * this filters out all Removed rate plans and charges after their effective end date
	 *
	 * Note: This means that products with pending changes will be retained e.g. switch or amount change
	 * @param today
	 */
	static activeNonEndedSubscriptionFilter(
		today: dayjs.Dayjs,
	): SubscriptionFilter {
		return new SubscriptionFilter(
			(rp) => (rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined),
			(rpc) =>
				dayjs(rpc.effectiveEndDate).isAfter(today)
					? undefined
					: `plan has finished: today: ${zuoraDateFormat(today)} >= end: ${zuoraDateFormat(dayjs(rpc.effectiveEndDate))}`,
		);
	}

	private filterCharges(charges: Record<string, RatePlanCharge>) {
		const [errors, filteredCharges] = partitionObjectByValueType(
			mapValues(charges, (rpc: RatePlanCharge) => {
				const chargeDiscardReason1 = this.chargeDiscardReason(rpc);
				return chargeDiscardReason1 !== undefined
					? `${rpc.name}: ${chargeDiscardReason1}`
					: rpc;
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
				if (maybeDiscardWholePlan !== undefined) {
					return `${rp.ratePlanName}: ${maybeDiscardWholePlan}`;
				}

				const { errors, filteredCharges } = this.filterCharges(
					rp.ratePlanCharges,
				);

				const maybeAllChargesDiscarded =
					objectKeys(filteredCharges).length === 0
						? `${rp.ratePlanName}: all charges discarded: ` +
							JSON.stringify(errors)
						: undefined;
				if (maybeAllChargesDiscarded !== undefined) {
					return maybeAllChargesDiscarded;
				}
				return { ...rp, ratePlanCharges: filteredCharges };
			}),
			(o) => typeof o === 'string',
		);
		return { discarded, ratePlans };
	}

	private filterRatePlanses<K extends ProductKey>(): (
		jbp: GuardianRatePlans<K>,
	) => GuardianRatePlans<K> {
		return (jbp: GuardianRatePlans<K>) =>
			mapValues(jbp, (guardianSubRatePlans: GuardianRatePlan[]) => {
				const { discarded, ratePlans } =
					this.filterRatePlanList(guardianSubRatePlans);
				if (discarded.length > 0) {
					logger.log(`discarded rateplans:`, discarded);
				} // could be spammy?
				if (ratePlans.length > 0) {
					logger.log(
						`retained rateplans:`,
						ratePlans.map((rp) => rp.ratePlanName),
					);
				} // could be very spammy?
				return ratePlans;
			}) satisfies GuardianRatePlans<K>;
	}

	filterSubscription(
		highLevelSub: GuardianSubscriptionWithProducts,
	): GuardianSubscriptionWithProducts {
		return mapValue(
			highLevelSub,
			'products',
			(products) => mapValuesCorrelated(products, this.filterRatePlanses()), // mapValues breaks the correlation, need to retain it
		);
	}
}

/**
 * non generic version of mapValues needed to maintain the relationship between key and value
 * (in a similar way to groupMapSingleOrThrowCorrelated)
 *
 * @param obj
 * @param fn
 */
export function mapValuesCorrelated<K extends ProductKey>(
	obj: { [T in K]?: GuardianRatePlans<T> },
	fn: <Q extends K>(v: GuardianRatePlans<Q>, k: K) => GuardianRatePlans<Q>,
): { [T in K]?: GuardianRatePlans<T> } {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function but TODO look again at this
	const res = {} as { [T in K]?: GuardianRatePlans<T> };
	for (const key of objectKeys(obj)) {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- utility function but TODO look again at this
		res[key as K] = obj[key] ? fn(obj[key], key) : undefined;
	}
	return res;
}
