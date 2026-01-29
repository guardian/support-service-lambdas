import { groupCollectByUniqueId } from '@modules/arrayFunctions';
import { mapOption } from '@modules/nullAndUndefined';
import type {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import {
	zuoraCatalogToProductKey,
	zuoraCatalogToProductRatePlanChargeKey,
	zuoraCatalogToProductRatePlanKey,
} from '@modules/product-catalog/zuoraToProductNameMappings';
import type {
	CatalogProduct,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

// these are the data structures that define the tree of product->rateplan->charge
// and let us attach the relevant ids and keys

type ZuoraProductRatePlanChargeKeyNode = { productRatePlanChargeKey: string };
export type ZuoraProductRatePlanChargeIdToKey = Record<
	string, // product rate plan charge id
	ZuoraProductRatePlanChargeKeyNode
>;

export type ZuoraProductRatePlanKeyNode<P extends ProductKey> = {
	productRatePlanKey: ProductRatePlanKey<P>;
	productRatePlanCharges: ZuoraProductRatePlanChargeIdToKey;
};
export type ZuoraProductRatePlanIdToKey<P extends ProductKey> = Record<
	string, // product rate plan id
	ZuoraProductRatePlanKeyNode<P>
>;

export type ZuoraProductKeyNode<P extends ProductKey> = {
	productKey: P;
	productRatePlans: ZuoraProductRatePlanIdToKey<P>;
};
export type ZuoraProductIdToKey = Record<
	string, // product id
	ZuoraProductKeyNode<ProductKey>
>;

/**
 * Build a tree mapping zuora product*id to their associated product catalog keys
 *
 * This is needed so that we can attach catalog keys to the subscription, therefore not needing to
 * keep the original catalog around and filter by id.
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
): [string, ZuoraProductKeyNode<ProductKey>] | undefined {
	const productKey: ProductKey | undefined =
		zuoraCatalogToProductKey[product.name];
	return mapOption(productKey, (key) => [
		product.id,
		buildZuoraProductKeyNode(product, key),
	]);
}

function buildZuoraProductKeyNode(
	product: CatalogProduct,
	productKey: ProductKey,
): ZuoraProductKeyNode<ProductKey> {
	return {
		productKey,
		productRatePlans:
			buildZuoraProductRatePlanIdToKey<typeof productKey>(product),
	};
}

/**
 * main entry point for building rate plans
 */
function buildZuoraProductRatePlanIdToKey<P extends ProductKey>(
	product: CatalogProduct,
): ZuoraProductRatePlanIdToKey<P> {
	return groupCollectByUniqueId(
		product.productRatePlans,
		wrapZuoraProductRatePlanKeyNode<P>,
		`duplicate product rate plan id in ${product.name}`,
	);
}

function wrapZuoraProductRatePlanKeyNode<P extends ProductKey>(
	prp: ZuoraProductRatePlan,
): [string, ZuoraProductRatePlanKeyNode<P>] | undefined {
	return mapOption(buildZuoraProductRatePlanKeyNode(prp), (k) => [prp.id, k]);
}

function buildZuoraProductRatePlanKeyNode<P extends ProductKey>(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanKeyNode<P> | undefined {
	const productRatePlanCharges = buildZuoraProductRatePlanChargeIdToKey(prp);
	return mapOption(
		zuoraCatalogToProductRatePlanKey[prp.name],
		(productRatePlanKey) => ({
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- zuoraCatalogToProductRatePlanKey doesn't retain the hierarchy
			productRatePlanKey: productRatePlanKey as ProductRatePlanKey<P>,
			productRatePlanCharges,
		}),
	);
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
): [string, ZuoraProductRatePlanChargeKeyNode] | undefined {
	return mapOption(buildZuoraProductRatePlanChargeKeyNode(prpc), (c) => [
		prpc.id,
		c,
	]);
}

function buildZuoraProductRatePlanChargeKeyNode(
	prpc: ZuoraProductRatePlanCharge,
): ZuoraProductRatePlanChargeKeyNode | undefined {
	return mapOption(
		zuoraCatalogToProductRatePlanChargeKey[prpc.name],
		(productRatePlanChargeKey) => ({
			productRatePlanChargeKey,
		}),
	);
}
