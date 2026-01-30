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
import type { RestRatePlanCharge } from '../../guardianSubscription/groupSubscriptionByZuoraCatalogIds';
import type { GuardianRatePlan } from '../../guardianSubscription/guardianSubscriptionParser';
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

function getSubscriptionTotalChargeAmount(
	ratePlanCharges: RestRatePlanCharge[],
) {
	return sumNumbers(
		ratePlanCharges.map((c: RestRatePlanCharge) =>
			getIfDefined(c.price, 'non priced charge on the rate plan (discount?)'),
		),
	);
}

function getDistinctChargeValue<T extends SafeForDistinct>(
	ratePlanCharges: RestRatePlanCharge[],
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

function getChargedThroughDate(ratePlanCharges: RestRatePlanCharge[]) {
	return mapOption(
		getDistinctChargeValue(ratePlanCharges, (ratePlanCharge: RatePlanCharge) =>
			ratePlanCharge.chargedThroughDate?.getTime(),
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

	return {
		accountNumber: subscription.accountNumber,
		subscriptionNumber: subscription.subscriptionNumber,
		previousProductName: ratePlan.productName,
		previousRatePlanName: ratePlan.ratePlanName,
		previousAmount: getSubscriptionTotalChargeAmount(
			objectValues(ratePlan.ratePlanCharges),
		),
		productRatePlanKey,
		termStartDate: subscription.termStartDate,
		chargedThroughDate: getChargedThroughDate(
			objectValues(ratePlan.ratePlanCharges),
		),
		productRatePlanId: ratePlan.productRatePlanId,
		chargeIds,
	} satisfies SubscriptionInformation;
}
