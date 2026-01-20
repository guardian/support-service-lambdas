import {
	GuardianRatePlan,
	GuardianRatePlans,
	GuardianSubscription,
	GuardianSubscriptionProducts,
} from './guardianSubscriptionBuilder';
import { RatePlanCharge } from '@modules/zuora/types';
import dayjs from 'dayjs';
import {
	mapValues,
	partitionByType,
	partitionByValueType,
} from '@modules/arrayFunctions';
import { mapProperty, objectKeys } from '@modules/objectFunctions';
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
					rp.ratePlanCharges,
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

	private filterProducts(
		products: GuardianSubscriptionProducts,
	): GuardianSubscriptionProducts {
		const filtered = mapValuesCorrelated(products, this.filterRatePlanses());
		return filtered; // FIXME mapValues breaks the correlation, need to recover it
	}

	private filterRatePlanses<K extends ProductKey>(): (
		jbp: GuardianRatePlans<K>,
	) => GuardianRatePlans<K> {
		return (jbp: GuardianRatePlans<K>) =>
			mapValues(jbp, (guardianSubRatePlans: GuardianRatePlan[]) => {
				const { discarded, ratePlans } =
					this.filterRatePlanList(guardianSubRatePlans);
				if (discarded.length > 0) logger.log(`discarded rateplans:`, discarded); // could be spammy?
				return ratePlans;
			}) satisfies GuardianRatePlans<K>;
	}

	filterSubscription(highLevelSub: GuardianSubscription): GuardianSubscription {
		return mapProperty(highLevelSub, 'products', (products) =>
			this.filterProducts(products),
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
	obj: { [T in K]: GuardianRatePlans<T> },
	fn: <Q extends K>(v: GuardianRatePlans<Q>, k: K) => GuardianRatePlans<Q>,
): { [T in K]: GuardianRatePlans<T> } {
	const res = {} as { [T in K]: GuardianRatePlans<T> };
	for (const key of objectKeys(obj)) {
		res[key as K] = fn(obj[key], key);
	}
	return res;
}
