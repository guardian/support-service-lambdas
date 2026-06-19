import type {
	GuardianCatalogKeys,
	ProductCatalog,
	ProductKey,
} from '@modules/product-catalog/productCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import {
	zuoraCatalogToProductKey,
	zuoraCatalogToProductRatePlanKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';

export function getGuardianKeysFromZuoraNames(
	productCatalog: ProductCatalog,
	zuoraProductName: string,
	zuoraProductRatePlanName: string,
): GuardianCatalogKeys | undefined {
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);
	const productKey: ProductKey | undefined =
		zuoraCatalogToProductKey[zuoraProductName];
	const productRatePlanKey: string | undefined =
		zuoraCatalogToProductRatePlanKey[zuoraProductRatePlanName];
	return productKey !== undefined && productRatePlanKey !== undefined
		? productCatalogHelper.validate(productKey, productRatePlanKey)
		: undefined;
}
