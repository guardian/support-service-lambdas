import { partitionByType } from '@modules/arrayFunctions';
import { mapValuesMap, partitionByValueType } from '@modules/mapFunctions';
import { logger } from '@modules/routing/logger';
import type { RatePlanCharge } from '@modules/zuora/types';
import { zuoraDateFormat } from '@modules/zuora/utils';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { RatePlanWithoutCharges } from './group/groupSubscriptionByZuoraCatalogIds';
import type { GuardianSubscriptionMultiPlan } from './guardianSubscriptionParser';
import type { GuardianRatePlanMap } from './reprocessRatePlans/guardianRatePlanBuilder';
import type { ZuoraRatePlan } from './reprocessRatePlans/zuoraRatePlanBuilder';

type GenericRatePlan = RatePlanWithoutCharges & {
	ratePlanCharges: Map<string, RatePlanCharge>;
};

/**
 * This removes irrelevant rate plans and charges from the subscription.
 *
 * The static methods provide some useful filters, or provide your own special one.
 */
export class SubscriptionFilter {
	constructor(
		private ratePlanDiscardReason: (
			rp: RatePlanWithoutCharges,
		) => string | undefined,
		private chargeDiscardReason: (
			rpc: RatePlanCharge,
			cancellationEffectiveDate: Dayjs | undefined,
		) => string | undefined,
	) {}

	/**
	 * this filters out all charges outside of their effective dates
	 * This would be useful if you want to know what someone is on right now, even
	 * if there's a future dated product switch.
	 *
	 * For cancelled subscriptions, it returns charges that are effective on the cancellation date.
	 *
	 * @param today
	 */
	static activeCurrentSubscriptionFilter(
		today: dayjs.Dayjs,
	): SubscriptionFilter {
		return new SubscriptionFilter(
			() => undefined,
			(rpc, cancellationEffectiveDate) =>
				(
					cancellationEffectiveDate === undefined
						? dayjs(rpc.effectiveStartDate).isBefore(today) ||
							dayjs(rpc.effectiveStartDate).isSame(today)
						: dayjs(rpc.effectiveEndDate) === cancellationEffectiveDate
				)
					? dayjs(rpc.effectiveEndDate).isAfter(today)
						? undefined
						: `plan has finished: today: ${zuoraDateFormat(today)} >= end: ${zuoraDateFormat(dayjs(rpc.effectiveEndDate))}`
					: `plan has not started: today: ${zuoraDateFormat(today)} < start: ${zuoraDateFormat(dayjs(rpc.effectiveStartDate))}`,
		);
	}

	/**
	 * this filters out all Removed rate plans and charges after their effective end date
	 *
	 * For cancelled subscriptions, it returns charges that were active on the cancellation date
	 *
	 * Note: This means that products with pending changes will be retained e.g. switch or amount change
	 * @param today
	 */
	static activeNonEndedSubscriptionFilter(
		today: dayjs.Dayjs,
	): SubscriptionFilter {
		return new SubscriptionFilter(
			(rp) => (rp.lastChangeType === 'Remove' ? 'plan is removed' : undefined),
			(rpc, cancellationEffectiveDate) =>
				(
					cancellationEffectiveDate === undefined
						? dayjs(rpc.effectiveEndDate).isAfter(today)
						: dayjs(rpc.effectiveEndDate).isSame(cancellationEffectiveDate)
				)
					? undefined
					: `plan has finished: today: ${zuoraDateFormat(today)} >= end: ${zuoraDateFormat(dayjs(rpc.effectiveEndDate))}`,
		);
	}

	/**
	 * main entry point to filter out non relevant rate plans/charges
	 */
	filterSubscription(
		highLevelSub: GuardianSubscriptionMultiPlan,
	): GuardianSubscriptionMultiPlan {
		const cancellationEffectiveDate =
			highLevelSub.status === 'Cancelled'
				? dayjs(highLevelSub.termEndDate)
				: undefined;
		const ratePlanFilter = new RatePlanFilter(
			this.ratePlanDiscardReason,
			(rpc) => this.chargeDiscardReason(rpc, cancellationEffectiveDate),
		);
		const withFilteredRatePlans: GuardianSubscriptionMultiPlan = {
			...highLevelSub,
			ratePlans: ratePlanFilter.filterRatePlansAndLog<GuardianRatePlanMap>(
				highLevelSub.ratePlans,
			),
		};
		return {
			...withFilteredRatePlans,
			productsNotInCatalog: ratePlanFilter.filterRatePlansAndLog<ZuoraRatePlan>(
				withFilteredRatePlans.productsNotInCatalog,
			),
		};
	}
}

class RatePlanFilter {
	constructor(
		private ratePlanDiscardReason: (
			rp: RatePlanWithoutCharges,
		) => string | undefined,
		private chargeDiscardReason: (rpc: RatePlanCharge) => string | undefined,
	) {}

	filterRatePlansAndLog<RP extends GenericRatePlan>(
		guardianSubRatePlans: RP[],
	): RP[] {
		const { discarded, ratePlans } =
			this.filterRatePlans<RP>(guardianSubRatePlans);
		if (discarded.length > 0) {
			logger.log(`discarded rateplans:`, discarded);
		} // could be spammy?
		if (ratePlans.length > 0) {
			logger.log(
				`retained rateplans:`,
				ratePlans.map((rp: RP) => rp.id),
			);
		} // could be very spammy?
		return ratePlans;
	}

	/**
	 * takes a list of rate plans and returns both the successful rate plans and the reasons others were removed
	 */
	filterRatePlans<RP extends GenericRatePlan>(
		unfilteredRatePlans: RP[],
	): {
		discarded: string[];
		ratePlans: RP[];
	} {
		const [discarded, filteredRatePlans] = partitionByType(
			unfilteredRatePlans.map((rp: RP) => {
				return this.filterRatePlan<RP>(rp);
			}),
			(errorOrRP): errorOrRP is string => typeof errorOrRP === 'string',
		);
		return { discarded, ratePlans: filteredRatePlans };
	}

	/**
	 * takes a single rate plan and returns either  the rate plan with its charges filtered, or the reason the rateplan
	 * was dropped
	 */
	private filterRatePlan<RP extends GenericRatePlan>(ratePlan: RP) {
		const maybeDiscardRatePlanReason = this.ratePlanDiscardReason(ratePlan);
		if (maybeDiscardRatePlanReason !== undefined) {
			return `${ratePlan.id}: ${maybeDiscardRatePlanReason}`;
		}

		const { errors, filteredCharges } = this.filterCharges(
			ratePlan.ratePlanCharges,
		);

		const maybeAllChargesDiscarded =
			filteredCharges.size === 0
				? `${ratePlan.id}: all charges discarded: ` + JSON.stringify(errors)
				: undefined;
		if (maybeAllChargesDiscarded !== undefined) {
			return maybeAllChargesDiscarded;
		}
		return { ...ratePlan, ratePlanCharges: filteredCharges };
	}

	/**
	 * Return the list of charges that passed the filter, along with the reason why the rest were filtered out, if any.
	 *
	 * keys are either string (name of charge in zuora) or ProductRatePlanChargeKey<P, RPK>
	 */
	//
	private filterCharges<K extends string>(
		unfilteredCharges: Map<K, RatePlanCharge>,
	): {
		errors: Map<K, string>;
		filteredCharges: Map<K, RatePlanCharge>;
	} {
		const [errors, filteredCharges] = partitionByValueType(
			mapValuesMap(unfilteredCharges, (rpc: RatePlanCharge) => {
				const maybeDiscardChargeReason = this.chargeDiscardReason(rpc);
				return maybeDiscardChargeReason !== undefined
					? `${rpc.id}: ${maybeDiscardChargeReason}`
					: rpc;
			}),
			(errorOrRPC): errorOrRPC is string => typeof errorOrRPC === 'string',
		);
		return { errors, filteredCharges };
	}
}
