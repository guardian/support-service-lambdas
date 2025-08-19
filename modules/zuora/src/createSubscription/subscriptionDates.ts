import { isDeliveryProductPurchase } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const DigitalSubscription = {
	freeTrialPeriodInDays: 14,
	paymentGracePeriodInDays: 2,
};

const GuardianAdLite = {
	freeTrialPeriodInDays: 15,
};

export const getSubscriptionDates = (
	now: Dayjs,
	productPurchase: ProductPurchase,
): {
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate: Dayjs;
} => {
	return {
		contractEffectiveDate: now,
		customerAcceptanceDate: getCustomerAcceptanceDate(now, productPurchase),
	};
};

const getCustomerAcceptanceDate = (
	now: Dayjs,
	productPurchase: ProductPurchase,
): Dayjs => {
	if (isDeliveryProductPurchase(productPurchase)) {
		return dayjs(productPurchase.firstDeliveryDate);
	}

	if (productPurchase.product === 'DigitalSubscription') {
		return now.add(
			DigitalSubscription.freeTrialPeriodInDays +
				DigitalSubscription.paymentGracePeriodInDays,
			'day',
		);
	}
	if (productPurchase.product === 'GuardianAdLite') {
		return now.add(GuardianAdLite.freeTrialPeriodInDays, 'day');
	}
	return now;
};
