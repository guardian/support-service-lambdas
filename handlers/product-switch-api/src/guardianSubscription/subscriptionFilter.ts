import { mapValues, partitionByType } from '@modules/arrayFunctions';
import {
	mapValue,
	objectKeys,
	partitionObjectByValueType,
} from '@modules/objectFunctions';
import { logger } from '@modules/routing/logger';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import type { RestRatePlanCharge } from './groupSubscriptionByZuoraCatalogIds';
import type {
	GenericRatePlan,
	GroupedGuardianSubscription,
	GuardianRatePlan,
	ZuoraRatePlan,
} from './guardianSubscriptionParser';

/**
 * This lets you iterate through rate plans and charges removing ones that you aren't interested in
 *
 * It provides a useful activeCurrentSubscriptionFilter for when we're only interested
 * in products that are not removed and effective as of today.
 */
export class SubscriptionFilter {
	constructor(
		private ratePlanDiscardReason: (rp: GenericRatePlan) => string | undefined,
		private chargeDiscardReason: (
			rpc: RestRatePlanCharge,
		) => string | undefined,
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
			(rp: GenericRatePlan) =>
				rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined,
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

	private filterCharges(charges: Record<string, RestRatePlanCharge>) {
		const [errors, filteredCharges] = partitionObjectByValueType(
			mapValues(charges, (rpc: RestRatePlanCharge) => {
				const chargeDiscardReason1 = this.chargeDiscardReason(rpc);
				return chargeDiscardReason1 !== undefined
					? `${rpc.id}: ${chargeDiscardReason1}`
					: rpc;
			}),
			(o) => typeof o === 'string',
		);
		return { errors, filteredCharges };
	}

	private filterRatePlanList<RP extends GenericRatePlan>(
		guardianSubRatePlans: RP[],
	): {
		discarded: string[];
		ratePlans: RP[];
	} {
		const [discarded, ratePlans] = partitionByType(
			guardianSubRatePlans.map((rp: RP) => {
				const maybeDiscardWholePlan = this.ratePlanDiscardReason(rp);
				if (maybeDiscardWholePlan !== undefined) {
					return `${rp.id}: ${maybeDiscardWholePlan}`;
				}

				const { errors, filteredCharges } = this.filterCharges(
					rp.ratePlanCharges,
				);

				const maybeAllChargesDiscarded =
					objectKeys(filteredCharges).length === 0
						? `${rp.id}: all charges discarded: ` + JSON.stringify(errors)
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

	private filterRatePlanses<RP extends GenericRatePlan>(
		guardianSubRatePlans: RP[],
	): RP[] {
		const { discarded, ratePlans } =
			this.filterRatePlanList(guardianSubRatePlans);
		if (discarded.length > 0) {
			logger.log(`discarded rateplans:`, discarded);
		} // could be spammy?
		if (ratePlans.length > 0) {
			logger.log(
				`retained rateplans:`,
				ratePlans.map((rp) => rp.id),
			);
		} // could be very spammy?
		return ratePlans;
	}

	filterSubscription(
		highLevelSub: GroupedGuardianSubscription,
	): GroupedGuardianSubscription {
		return mapValue(
			mapValue(highLevelSub, 'ratePlans', (ratePlans) =>
				this.filterRatePlanses<GuardianRatePlan>(ratePlans),
			),
			'productsNotInCatalog',
			(ratePlans) => this.filterRatePlanses<ZuoraRatePlan>(ratePlans),
		);
	}
}
