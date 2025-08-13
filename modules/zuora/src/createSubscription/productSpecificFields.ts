// Extended type that adds fields based on product value
import type { DeliveryProductKey } from '@modules/product-catalog/productCatalog';
import { deliveryProducts } from '@modules/product-catalog/productCatalog';
import type { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import type { Contact } from '@modules/zuora/orders/newAccount';

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

// type NewProductKey = ProductPurchase['product'];
// // This will cause a TypeScript error if the types don't match exactly
// type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false;
// export type AreEqual = AssertEqual<NewProductKey, ProductKey>;
//
// // Find values in NewProductKey that are NOT in ProductKey
// type InNewButNotInProduct = Exclude<NewProductKey, ProductKey>;
//
// // Find values in ProductKey that are NOT in NewProductKey
// type InProductButNotInNew = Exclude<ProductKey, NewProductKey>;
//
// // Test if there are any differences
// type HasDifferences = InNewButNotInProduct | InProductButNotInNew extends never
// 	? false
// 	: true;
//
// export const blah: NewProductKey = 'NationalDelivery';

export function isDeliveryProduct<T extends ProductPurchase>(
	fields: ProductSpecificFields<T>,
): fields is ProductSpecificFields<T> & {
	soldToContact: Contact;
	firstDeliveryDate: string;
} {
	return deliveryProducts.includes(fields.product as DeliveryProductKey);
}
