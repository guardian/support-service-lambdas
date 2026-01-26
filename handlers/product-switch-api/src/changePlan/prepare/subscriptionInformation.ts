import type {
	SafeForDistinct} from '@modules/arrayFunctions';
import {
	distinct,
	getIfNonEmpty,
	headOption,
	sumNumbers,
} from '@modules/arrayFunctions';
import { objectValues } from '@modules/objectFunctions';
import type { RatePlanCharge } from '@modules/zuora/types';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type {
	GuardianSubscriptionWithKeys,
	SinglePlanGuardianSubscription,
} from '../../guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import type { GuardianRatePlanCharges } from '../../guardianSubscription/guardianSubscriptionParser';
import type {
	ValidSwitchableRatePlanKey} from './switchesHelper';
import {
	isValidSwitchableRatePlanKey
} from './switchesHelper';

export type SubscriptionInformation = {
	accountNumber: string; // order
	subscriptionNumber: string;
	previousProductName: string; // sf tracking
	previousRatePlanName: string; //sf tracking
	previousAmount: number; //sf tracking
	productRatePlanKey: ValidSwitchableRatePlanKey; // email, FIXME supporter product data(need TARGET rate plan name)
	termStartDate: Date; // order
	chargedThroughDate?: Dayjs; // refund check
	productRatePlanId: string; // order
	chargeIds: [string, ...string[]]; // filter invoice refund items, find if charged through date are the same and are is today(todo can return it from single plan sub) // needed to find the refund amount in the invoice (todo total it) and the charged through date (todo toSet it and check it's unique)
};

function getSubscriptionTotalChargeAmount(
	subscription: SinglePlanGuardianSubscription,
) {
	return sumNumbers(
		objectValues(subscription.ratePlan.ratePlanCharges).flatMap(
			(c: RatePlanCharge) => (c.price !== null ? [c.price] : []),
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
	const value: T | undefined = headOption(
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

function getChargedThroughDate(subscription: SinglePlanGuardianSubscription) {
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

	const productRatePlanKey = productCatalogKeys.productRatePlanKey;
	if (!isValidSwitchableRatePlanKey(productRatePlanKey))
		// TODO move check to high level sub reader
		{throw new Error(`unsupported rate plan key ${productRatePlanKey}`);}

	const previousAmount = getSubscriptionTotalChargeAmount(subscription);

	const chargeIds = getIfNonEmpty(
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
