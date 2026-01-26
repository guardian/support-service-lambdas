import { groupMapSingleOrThrow } from '@modules/arrayFunctions';
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
export type ZuoraProductRatePlanKeyNode<P extends ProductKey> = {
	productRatePlanKey: ProductRatePlanKey<P> & string;
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
	return groupMapSingleOrThrow(
		catalog.products,
		buildZuoraProductKeyNode,
		'duplicate product id',
	);
}

function buildZuoraProductKeyNode(
	product: CatalogProduct,
): [string, ZuoraProductKeyNode<ProductKey>] | undefined {
	if (!isSupportedProduct(product.name)) {return undefined;}
	const productKey = getZuoraProductKey(product.name);
	return [
		product.id,
		{
			productKey,
			productRatePlans:
				buildZuoraProductRatePlanIdToKey<typeof productKey>(product),
		},
	];
}

function buildZuoraProductRatePlanIdToKey<P extends ProductKey>(
	product: CatalogProduct,
): ZuoraProductRatePlanIdToKey<P> {
	return groupMapSingleOrThrow(
		product.productRatePlans,
		buildZuoraProductRatePlanKeyNode<P>,
		`duplicate product rate plan id in ${product.name}`,
	);
}

function buildZuoraProductRatePlanKeyNode<P extends ProductKey>(
	prp: ZuoraProductRatePlan,
): [string, ZuoraProductRatePlanKeyNode<P>] | undefined {
	if (!isSupportedProductRatePlan(prp.name)) {return undefined;}
	const productRatePlanCharges = buildZuoraProductRatePlanChargeIdToKey(prp);
	return [
		prp.id,
		{
			productRatePlanKey: getProductRatePlanKey(
				prp.name,
			) as ProductRatePlanKey<P> & string, // bad return type on existing getProductRatePlanKey function
			productRatePlanCharges,
		},
	];
}

function buildZuoraProductRatePlanChargeIdToKey(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanChargeIdToKey {
	return groupMapSingleOrThrow(
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
			productRatePlanChargeKey: getProductRatePlanChargeKey(prpc.name),
		},
	];
}
