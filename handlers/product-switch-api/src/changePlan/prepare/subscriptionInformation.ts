import type { SafeForDistinct } from '@modules/arrayFunctions';
import {
	distinct,
	getMaybeSingleOrThrow,
	sumNumbers,
} from '@modules/arrayFunctions';
import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianRatePlan } from '@modules/guardian-subscription/reprocessRatePlans/guardianRatePlanBuilder';
import {
	getIfDefined,
	getNonEmptyOrThrow,
	mapOption,
} from '@modules/nullAndUndefined';
import { objectValues } from '@modules/objectFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ValidSwitchableRatePlanKey } from './switchCatalogHelper';
import { asSwitchableRatePlanKey } from './switchCatalogHelper';

export type SubscriptionInformation = {
	accountNumber: string; // order
	subscriptionNumber: string;
	previousProductName: string; // sf tracking
	previousRatePlanName: string; //sf tracking
	previousAmount: number; //sf tracking
	includesContribution: boolean;
	productRatePlanKey: ValidSwitchableRatePlanKey; // email
	termStartDate: Date; // order
	chargedThroughDate?: Dayjs; // refund check
	ratePlanId: string; // order
	chargeIds: [string, ...string[]]; // filter invoice refund items
};

function getSubscriptionTotalChargeAmount(ratePlanCharges: RatePlanCharge[]) {
	return sumNumbers(
		ratePlanCharges.map((c: RatePlanCharge) =>
			getIfDefined(c.price, 'non priced charge on the rate plan (discount?)'),
		),
	);
}

function getDistinctChargeValue<T extends SafeForDistinct>(
	ratePlanCharges: RatePlanCharge[],
	getValue: (value: RatePlanCharge) => T,
): T | undefined {
	const values = ratePlanCharges.map(getValue);
	const asSet = distinct(values);
	const value: T | undefined = getMaybeSingleOrThrow(
		asSet,
		(msg) =>
			new Error(
				"couldn't extract a chargedThroughDate from the charges: " +
					msg +
					' was: ' +
					JSON.stringify(asSet),
			),
	);
	return value;
}

/**
 * the charged through date is a good way of knowing when the next payment will be taken, if
 * it's a new charge then look at the start date.
 *
 * @param ratePlanCharges
 */
function getNextPaymentDate(ratePlanCharges: RatePlanCharge[]) {
	return mapOption(
		getDistinctChargeValue(ratePlanCharges, (ratePlanCharge: RatePlanCharge) =>
			(
				ratePlanCharge.chargedThroughDate ?? ratePlanCharge.effectiveStartDate
			).getTime(),
		),
		(e) => dayjs(new Date(e)),
	);
}

export function getSubscriptionInformation(
	subscription: GuardianSubscription,
): SubscriptionInformation {
	const ratePlan: GuardianRatePlan = subscription.ratePlan;
	const productRatePlanKey: ValidSwitchableRatePlanKey =
		asSwitchableRatePlanKey(ratePlan.productRatePlanKey);

	const chargeIds = getNonEmptyOrThrow(
		objectValues(ratePlan.ratePlanCharges).map(
			(c) => c.productRatePlanChargeId,
		),
		'missing charges',
	);
	let includesContribution = false;
	switch (ratePlan.productKey) {
		case 'Contribution':
			includesContribution = true;
			break;
		case 'SupporterPlus':
			switch (ratePlan.productRatePlanKey) {
				case 'Annual':
				case 'Monthly':
					includesContribution =
						getIfDefined(
							ratePlan.ratePlanCharges.Contribution.price,
							'missing contribution price',
						) > 0;
			}
	}

	return {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: ratePlan.productName,
		previousRatePlanName: ratePlan.ratePlanName,
		previousAmount: getSubscriptionTotalChargeAmount(
			objectValues(ratePlan.ratePlanCharges),
		),
		includesContribution,
		productRatePlanKey,
		termStartDate: subscription.termStartDate,
		chargedThroughDate: getNextPaymentDate(
			objectValues(ratePlan.ratePlanCharges),
		),
		ratePlanId: ratePlan.id,
		chargeIds,
	} satisfies SubscriptionInformation;
}
