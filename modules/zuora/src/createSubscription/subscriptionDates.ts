import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { ProductSpecificFields } from '@modules/zuora/createSubscription/productSpecificFields';
import { isDeliveryProduct } from '@modules/zuora/createSubscription/productSpecificFields';

const DigitalSubscription = {
	freeTrialPeriodInDays: 14,
	paymentGracePeriodInDays: 2,
};

const GuardianAdLite = {
	freeTrialPeriodInDays: 15,
};

export const getSubscriptionDates = <T extends ProductPurchase>(
	now: Dayjs,
	productSpecificFields: ProductSpecificFields<T>,
): {
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate: Dayjs;
} => {
	return {
		contractEffectiveDate: now,
		customerAcceptanceDate: getCustomerAcceptanceDate(
			now,
			productSpecificFields,
		),
	};
};

const getCustomerAcceptanceDate = <T extends ProductPurchase>(
	now: Dayjs,
	productSpecificFields: ProductSpecificFields<T>,
): Dayjs => {
	if (isDeliveryProduct(productSpecificFields)) {
		return dayjs(productSpecificFields.firstDeliveryDate);
	}

	if (productSpecificFields.product === 'DigitalSubscription') {
		return now.add(
			DigitalSubscription.freeTrialPeriodInDays +
				DigitalSubscription.paymentGracePeriodInDays,
			'day',
		);
	}
	if (productSpecificFields.product === 'GuardianAdLite') {
		return now.add(GuardianAdLite.freeTrialPeriodInDays, 'day');
	}
	return now;
};
