import { groupByUniqueOrThrowMap, mapValuesMap } from '@modules/mapFunctions';
import type {
	CatalogProduct,
	ProductId,
	ProductRatePlanChargeId,
	ProductRatePlanId,
	ZuoraCatalog,
	ZuoraProductRatePlan,
	ZuoraProductRatePlanCharge,
} from '@modules/zuora-catalog/zuoraCatalogSchema';

// these are the data structures that define the tree of product->rateplan->charge
// and let us attach the relevant ids and keys

export type ZuoraProductRatePlanChargeIdMap = Map<
	ProductRatePlanChargeId,
	ZuoraProductRatePlanCharge
>;

export type ZuoraProductRatePlanNode = {
	zuoraProductRatePlan: ZuoraProductRatePlan;
	productRatePlanCharges: ZuoraProductRatePlanChargeIdMap;
};
export type ZuoraProductRatePlanIdMap = Map<
	ProductRatePlanId,
	ZuoraProductRatePlanNode
>;

export type ZuoraProductNode = {
	zuoraProduct: CatalogProduct;
	productRatePlans: ZuoraProductRatePlanIdMap;
};
export type ZuoraProductIdMap = Map<ProductId, ZuoraProductNode>;

/**
 * Build a tree mapping zuora product*id to their associated product catalog entries
 *
 * This is needed so that we can attach catalog information keys to the subscription, therefore not needing to
 * keep the original catalog around and filter by id.
 *
 * @param catalog zuora catalog (this is needed as Discounts is not in the product-catalog at present)
 */
export function buildZuoraProductIdToKey(
	catalog: ZuoraCatalog,
): ZuoraProductIdMap {
	return mapValuesMap(
		groupByUniqueOrThrowMap(
			catalog.products,
			(p) => p.id,
			'duplicate product id',
		),
		buildZuoraProductKeyNode,
	);
}

function buildZuoraProductKeyNode(
	zuoraProduct: CatalogProduct,
): ZuoraProductNode {
	return {
		zuoraProduct,
		productRatePlans: buildZuoraProductRatePlanIdToKey(zuoraProduct),
	};
}

/**
 * main entry point for building rate plans
 */
function buildZuoraProductRatePlanIdToKey(
	product: CatalogProduct,
): ZuoraProductRatePlanIdMap {
	return mapValuesMap(
		groupByUniqueOrThrowMap(
			product.productRatePlans,
			(prp) => prp.id,
			`duplicate product rate plan id in ${product.name}`,
		),
		wrapZuoraProductRatePlanKeyNode,
	);
}

function wrapZuoraProductRatePlanKeyNode(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanNode {
	return {
		zuoraProductRatePlan: prp,
		productRatePlanCharges: buildZuoraProductRatePlanChargeIdToKey(prp),
	};
}

/**
 * main entry point for building rate plan charges
 */
function buildZuoraProductRatePlanChargeIdToKey(
	prp: ZuoraProductRatePlan,
): ZuoraProductRatePlanChargeIdMap {
	return groupByUniqueOrThrowMap(
		prp.productRatePlanCharges,
		(prpc: ZuoraProductRatePlanCharge) => prpc.id,
		`duplicate product rate plan charge id in rate plan ${prp.name}`,
	);
}
