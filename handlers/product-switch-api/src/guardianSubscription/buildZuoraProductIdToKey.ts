import { groupCollectByUniqueId } from '@modules/arrayFunctions';
import type {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	getZuoraProductKey,
	isSupportedProduct,
	isSupportedProductRatePlan,
	isSupportedProductRatePlanCharge,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

type ZuoraProductRatePlanChargeKeyNode = { productRatePlanChargeKey: string };
export type ZuoraProductRatePlanChargeIdToKey = Record<
	string, // product rate plan charge id
	ZuoraProductRatePlanChargeKeyNode
>;
export type ProductWithDiscountRatePlanKey<P extends ProductKeyWithDiscount> =
	P extends 'Discounts' ? string : ProductRatePlanKey<Extract<P, ProductKey>>;
export type ZuoraProductRatePlanKeyNode<P extends ProductKeyWithDiscount> = {
	productRatePlanKey: ProductWithDiscountRatePlanKey<P>;
	productRatePlanCharges: ZuoraProductRatePlanChargeIdToKey;
};
export type ZuoraProductRatePlanIdToKey<P extends ProductKeyWithDiscount> =
	Record<
		string, // product rate plan id
		ZuoraProductRatePlanKeyNode<P>
	>;
export type ProductKeyWithDiscount = ProductKey | 'Discounts';
export type ZuoraProductKeyNode<P extends ProductKeyWithDiscount> = {
	productKey: P;
	productRatePlans: ZuoraProductRatePlanIdToKey<P>;
};
export type ZuoraProductIdToKey = Record<
	string, // product id
	ZuoraProductKeyNode<ProductKeyWithDiscount>
>;

/**
 * This lets us look up the guardian product catalog keys for give product*Ids
 *
 * This is essential when linking an existing subscription to its associated product catalog entry.
 *
 * Note: It may be possible to build this from the guardian product catalog instead
 *
 * @param catalog
 */
export function buildZuoraProductIdToKey(
	catalog: ZuoraCatalog,
): ZuoraProductIdToKey {
	return groupCollectByUniqueId(
		catalog.products,
		buildZuoraProductKeyNode,
		'duplicate product id',
	);
}

function buildZuoraProductKeyNode(
	product: CatalogProduct,
): [string, ZuoraProductKeyNode<ProductKeyWithDiscount>] | undefined {
	if (!isSupportedProduct(product.name) && product.name !== 'Discounts') {
		return undefined;
	}
	const productKey =
		product.name !== 'Discounts'
			? getZuoraProductKey(product.name)
			: 'Discounts';
	return [
		product.id,
		{
			productKey,
			productRatePlans:
				buildZuoraProductRatePlanIdToKey<typeof productKey>(product),
		},
	];
}

function buildZuoraProductRatePlanIdToKey<P extends ProductKeyWithDiscount>(
	product: CatalogProduct,
): ZuoraProductRatePlanIdToKey<P> {
	return groupCollectByUniqueId(
		product.productRatePlans,
		buildZuoraProductRatePlanKeyNode<P>,
		`duplicate product rate plan id in ${product.name}`,
	);
}

function buildZuoraProductRatePlanKeyNode<P extends ProductKeyWithDiscount>(
	prp: ZuoraProductRatePlan,
): [string, ZuoraProductRatePlanKeyNode<P>] | undefined {
	const productRatePlanCharges = buildZuoraProductRatePlanChargeIdToKey(prp);
	return [
		prp.id,
		{
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO check - bad return type on existing getProductRatePlanKey function
			productRatePlanKey: (isSupportedProductRatePlan(prp.name)
				? getProductRatePlanKey(prp.name)
				: prp.name) as ProductWithDiscountRatePlanKey<P>, // no proper guardian name for some rate plans e.g. discount - fall back to catalog name
			productRatePlanCharges,
		},
	];
}

function buildZuoraProductRatePlanChargeIdToKey(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanChargeIdToKey {
	return groupCollectByUniqueId(
		prp.productRatePlanCharges,
		buildZuoraProductRatePlanChargeKeyNode,
		`duplicate product rate plan charge id in rate plan ${prp.name}`,
	);
}

function buildZuoraProductRatePlanChargeKeyNode(
	prpc: ZuoraProductRatePlanCharge,
): [string, ZuoraProductRatePlanChargeKeyNode] {
	return [
		prpc.id,
		{
			productRatePlanChargeKey: isSupportedProductRatePlanCharge(prpc.name)
				? getProductRatePlanChargeKey(prpc.name)
				: prpc.name, // no proper guardian name for some rate plan charges e.g. discount charges - fall back to catalog name
		},
	];
}
