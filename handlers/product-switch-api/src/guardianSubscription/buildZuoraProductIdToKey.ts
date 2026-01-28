import { groupCollectByUniqueId } from '@modules/arrayFunctions';
import { mapOption } from '@modules/nullAndUndefined';
import type {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	getProductRatePlanChargeKey,
	getProductRatePlanKey,
	isSupportedProductRatePlan,
	isSupportedProductRatePlanCharge,
	zuoraCatalogToProductKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

/*
This file deals with building a tree mapping zuora product*id to their associated product catalog keys
 */

// these are the data structures that define the tree of product->rateplan->charge
// and let us attach the relevant ids and keys

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
 * main entry point to build the whole tree
 *
 * @param catalog zuora catalog (this is needed as Discounts is not in the product-catalog at present)
 */
export function buildZuoraProductIdToKey(
	catalog: ZuoraCatalog,
): ZuoraProductIdToKey {
	return groupCollectByUniqueId(
		catalog.products,
		wrapZuoraProductKeyNode,
		'duplicate product id',
	);
}

function wrapZuoraProductKeyNode(
	product: CatalogProduct,
): [string, ZuoraProductKeyNode<ProductKeyWithDiscount>] | undefined {
	const productKey: ProductKeyWithDiscount | undefined =
		product.name === 'Discounts'
			? ('Discounts' as const)
			: zuoraCatalogToProductKey[product.name];
	return mapOption(productKey, (key) => [
		product.id,
		buildZuoraProductKeyNode(product, key),
	]);
}

function buildZuoraProductKeyNode(
	product: CatalogProduct,
	productKey: ProductKeyWithDiscount,
): ZuoraProductKeyNode<ProductKeyWithDiscount> {
	return {
		productKey,
		productRatePlans:
			buildZuoraProductRatePlanIdToKey<typeof productKey>(product),
	};
}

/**
 * main entry point for building rate plans
 */
function buildZuoraProductRatePlanIdToKey<P extends ProductKeyWithDiscount>(
	product: CatalogProduct,
): ZuoraProductRatePlanIdToKey<P> {
	return groupCollectByUniqueId(
		product.productRatePlans,
		wrapZuoraProductRatePlanKeyNode<P>,
		`duplicate product rate plan id in ${product.name}`,
	);
}

function wrapZuoraProductRatePlanKeyNode<P extends ProductKeyWithDiscount>(
	prp: ZuoraProductRatePlan,
): [string, ZuoraProductRatePlanKeyNode<P>] | undefined {
	return [prp.id, buildZuoraProductRatePlanKeyNode(prp)];
}

function buildZuoraProductRatePlanKeyNode<P extends ProductKeyWithDiscount>(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanKeyNode<P> {
	const productRatePlanCharges = buildZuoraProductRatePlanChargeIdToKey(prp);
	return {
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- TODO check - bad return type on existing getProductRatePlanKey function
		productRatePlanKey: (isSupportedProductRatePlan(prp.name)
			? getProductRatePlanKey(prp.name)
			: prp.name) as ProductWithDiscountRatePlanKey<P>, // no proper guardian name for some rate plans e.g. discount - fall back to catalog name
		productRatePlanCharges,
	};
}

/**
 * main entry point for building rate plan charges
 */
function buildZuoraProductRatePlanChargeIdToKey(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanChargeIdToKey {
	return groupCollectByUniqueId(
		prp.productRatePlanCharges,
		wrapZuoraProductRatePlanChargeKeyNode,
		`duplicate product rate plan charge id in rate plan ${prp.name}`,
	);
}

function wrapZuoraProductRatePlanChargeKeyNode(
	prpc: ZuoraProductRatePlanCharge,
): [string, ZuoraProductRatePlanChargeKeyNode] {
	return [prpc.id, buildZuoraProductRatePlanChargeKeyNode(prpc)];
}

function buildZuoraProductRatePlanChargeKeyNode(
	prpc: ZuoraProductRatePlanCharge,
): ZuoraProductRatePlanChargeKeyNode {
	return {
		productRatePlanChargeKey: isSupportedProductRatePlanCharge(prpc.name)
			? getProductRatePlanChargeKey(prpc.name)
			: prpc.name, // no proper guardian name for some rate plan charges e.g. discount charges - fall back to catalog name
	};
}
