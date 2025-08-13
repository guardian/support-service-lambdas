// Extended type that adds fields based on product value
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { Contact } from '@modules/zuora/orders/newAccount';
import { DeliveryProductKey } from '@modules/product-catalog/productCatalog';

export type ProductSpecificFields<T extends ProductPurchase = ProductPurchase> =
	T extends { product: 'NationalDelivery' }
		? T & {
				firstDeliveryDate: string;
				soldToContact: Contact;
				deliveryAgent: string;
			}
		: T extends {
					product: DeliveryProductKey;
			  }
			? T & { firstDeliveryDate: string; soldToContact: Contact }
			: T;

export function isDeliveryProduct<T extends ProductSpecificFields>(
	fields: ProductSpecificFields<T>,
): fields is ProductSpecificFields<T> & {
	soldToContact: Contact;
	firstDeliveryDate: string;
} {
	const deliveryProducts = [
		'HomeDelivery',
		'SubscriptionCard',
		'TierThree',
		'GuardianWeeklyDomestic',
		'GuardianWeeklyRestOfWorld',
		'NationalDelivery',
	];
	return deliveryProducts.includes(fields.product);
}

export function isNationalDeliveryProduct<P extends ProductSpecificFields>(
	fields: ProductSpecificFields<P>,
): fields is ProductSpecificFields<P> & { deliveryAgent: string } {
	return fields.product === 'NationalDelivery';
}

// For HomeDelivery specifically
export const homeDeliveryPurchase: ProductSpecificFields = {
	product: 'HomeDelivery',
	ratePlan: 'EverydayPlus',
	firstDeliveryDate: '2023-01-01', // Required
	soldToContact: {
		firstName: 'John',
		lastName: 'Doe',
		workEmail: '',
		country: 'GB',
	},
};

export const nationalDeliveryPurchase: ProductSpecificFields = {
	product: 'NationalDelivery',
	ratePlan: 'EverydayPlus',
	firstDeliveryDate: '2023-01-01', // Required
	soldToContact: {
		firstName: 'John',
		lastName: 'Doe',
		workEmail: '',
		country: 'GB',
	},
	deliveryAgent: '123',
};

// For digital products (no extra fields)
export const digitalPurchase: ProductSpecificFields = {
	product: 'DigitalSubscription',
	ratePlan: 'Monthly',
	// No extra fields required
};

export function getFirstDeliveryDate<T extends ProductSpecificFields>(
	productSpecificState: T,
): string | undefined {
	if (productSpecificState.product === 'HomeDelivery') {
		return productSpecificState.firstDeliveryDate;
	}
	return;
}
