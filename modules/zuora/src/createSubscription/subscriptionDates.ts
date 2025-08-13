import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { ProductSpecificFields } from '@modules/zuora/createSubscription/productSpecificFields';

const DigitalSubscription = {
	freeTrialPeriodInDays: 14,
	paymentGracePeriodInDays: 2,
};

const GuardianAdLite = {
	freeTrialPeriodInDays: 15,
};

export const getSubscriptionDates = <T extends ProductSpecificFields>(
	now: Dayjs,
	productSpecificState: T,
): {
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate: Dayjs;
} => {
	return {
		contractEffectiveDate: now,
		customerAcceptanceDate: getCustomerAcceptanceDate(
			now,
			productSpecificState,
		),
	};
};

const getCustomerAcceptanceDate = <T extends ProductSpecificFields>(
	now: Dayjs,
	productSpecificState: T,
): Dayjs => {
	switch (productSpecificState.product) {
		case 'GuardianWeeklyDomestic':
		case 'GuardianWeeklyRestOfWorld':
		case 'TierThree':
		case 'Paper':
			return dayjs(productSpecificState.firstDeliveryDate);
		case 'DigitalSubscription':
			return now.add(
				DigitalSubscription.freeTrialPeriodInDays +
					DigitalSubscription.paymentGracePeriodInDays,
				'day',
			);
		case 'GuardianAdLite':
			return now.add(GuardianAdLite.freeTrialPeriodInDays, 'day');

		default:
			return now;
	}
};
