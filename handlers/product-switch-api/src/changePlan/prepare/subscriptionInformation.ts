import type { SafeForDistinct } from '@modules/arrayFunctions';
import {
	distinct,
	getMaybeSingleOrThrow,
	getNonEmptyOrThrow,
	sumNumbers,
} from '@modules/arrayFunctions';
import { getIfDefined, mapOption } from '@modules/nullAndUndefined';
import { objectValues } from '@modules/objectFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { GuardianSubscription } from '../../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type {
	GuardianRatePlanCharge,
	GuardianRatePlanCharges,
} from '../../guardianSubscription/guardianSubscriptionParser';
import type { ValidSwitchableRatePlanKey } from './switchCatalogHelper';
import { asSwitchableRatePlanKey } from './switchCatalogHelper';

export type SubscriptionInformation = {
	accountNumber: string; // order
	subscriptionNumber: string;
	previousProductName: string; // sf tracking
	previousRatePlanName: string; //sf tracking
	previousAmount: number; //sf tracking
	productRatePlanKey: ValidSwitchableRatePlanKey; // email
	termStartDate: Date; // order
	chargedThroughDate?: Dayjs; // refund check
	productRatePlanId: string; // order
	chargeIds: [string, ...string[]]; // filter invoice refund items
};

function getSubscriptionTotalChargeAmount(subscription: GuardianSubscription) {
	return sumNumbers(
		objectValues(subscription.ratePlan.ratePlanCharges).map(
			(c: GuardianRatePlanCharge) =>
				getIfDefined(c.price, 'non priced charge on the rate plan (discount?)'),
		),
	);
}

function getDistinctChargeValue<T extends SafeForDistinct>(
	ratePlanCharges: GuardianRatePlanCharges,
	getValue: (value: RatePlanCharge) => T,
): T | undefined {
	const sourceCharges = objectValues(ratePlanCharges);

	const values = sourceCharges.map(getValue);
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

function getChargedThroughDate(subscription: GuardianSubscription) {
	return mapOption(
		getDistinctChargeValue(
			subscription.ratePlan.ratePlanCharges,
			(ratePlanCharge: RatePlanCharge) =>
				ratePlanCharge.chargedThroughDate?.getTime(),
		),
		(e) => dayjs(new Date(e)),
	);
}

export function getSubscriptionInformation(
	subscription: GuardianSubscription,
): SubscriptionInformation {
	const productRatePlanKey: ValidSwitchableRatePlanKey =
		asSwitchableRatePlanKey(subscription.ratePlan.productRatePlanKey);

	const chargeIds = getNonEmptyOrThrow(
		objectValues(subscription.ratePlan.ratePlanCharges).map(
			(c) => c.productRatePlanChargeId,
		),
		'missing charges',
	);

	return {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: subscription.ratePlan.productName,
		previousRatePlanName: subscription.ratePlan.ratePlanName,
		previousAmount: getSubscriptionTotalChargeAmount(subscription),
		productRatePlanKey,
		termStartDate: subscription.termStartDate,
		chargedThroughDate: getChargedThroughDate(subscription),
		productRatePlanId: subscription.ratePlan.productRatePlanId,
		chargeIds,
	} satisfies SubscriptionInformation;
}
