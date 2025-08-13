// Extended type that adds fields based on product value
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { Contact } from '@modules/zuora/orders/newAccount';
import {
	DeliveryProductKey,
	deliveryProducts,
} from '@modules/product-catalog/productCatalog';

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

export function isDeliveryProduct<T extends ProductPurchase>(
	fields: ProductSpecificFields<T>,
): fields is ProductSpecificFields<T> & {
	soldToContact: Contact;
	firstDeliveryDate: string;
} {
	return deliveryProducts.includes(fields.product as DeliveryProductKey);
}
