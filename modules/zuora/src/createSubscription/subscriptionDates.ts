import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { isDeliveryProductPurchase } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';

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
	return now;
};
