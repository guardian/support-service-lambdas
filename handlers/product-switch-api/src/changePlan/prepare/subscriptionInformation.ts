import type { SafeForDistinct } from '@modules/arrayFunctions';
import {
	distinct,
	getMaybeSingleOrThrow,
	getNonEmptyOrThrow,
	sumNumbers,
} from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectValues } from '@modules/objectFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type {
	GuardianSubscription,
	GuardianSubscriptionWithKeys,
} from '../../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianRatePlanCharges } from '../../guardianSubscription/guardianSubscriptionParser';
import type { ValidSwitchableRatePlanKey } from './switchesHelper';
import { isValidSwitchableRatePlanKey } from './switchesHelper';

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
			(c: RatePlanCharge) =>
				getIfDefined(c.price, 'non priced charge on the rate plan (discount?)'),
		),
	);
}

export function shouldStartNewTerm(termStartDate: Date, today: dayjs.Dayjs) {
	const termStartDate1 = dayjs(termStartDate).startOf('day');
	const startOfToday = today.startOf('day');
	const startNewTerm = termStartDate1.isBefore(startOfToday);
	return startNewTerm;
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
	return getDistinctChargeValue(
		subscription.ratePlan.ratePlanCharges,
		(ratePlanCharge: RatePlanCharge) =>
			ratePlanCharge.chargedThroughDate?.getTime(),
	);
}

export function getSubscriptionInformation({
	subscription,
	productCatalogKeys,
}: GuardianSubscriptionWithKeys) {
	const bareChargedThrough = getChargedThroughDate(subscription);
	const chargedThroughDate: Dayjs | undefined =
		bareChargedThrough !== undefined
			? dayjs(new Date(bareChargedThrough))
			: undefined;

	const productRatePlanKey: string = productCatalogKeys.productRatePlanKey;
	if (!isValidSwitchableRatePlanKey(productRatePlanKey)) {
		// TODO move check to high level sub reader
		throw new Error(`unsupported rate plan key ${productRatePlanKey}`);
	}

	const previousAmount = getSubscriptionTotalChargeAmount(subscription);

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
		previousAmount,
		productRatePlanKey,
		termStartDate: subscription.termStartDate,
		chargedThroughDate,
		productRatePlanId: subscription.ratePlan.productRatePlanId,
		chargeIds,
	} satisfies SubscriptionInformation;
}
