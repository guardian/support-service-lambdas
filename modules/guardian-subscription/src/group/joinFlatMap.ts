import { joinAllLeft } from '@modules/mapFunctions';

/**
 * Joins two maps by key, applies mapFn to each matched pair, then flattens
 * the resulting ratePlans and productsNotInCatalog arrays.
 *
 * Used in guardianSubscriptionParser.ts (via joinProductsAndRatePlans) to join
 * to join subscription rate plans against catalog entries at both the product
 * and rate-plan levels.
 */
export function joinFlatMap<K, S, C, RP, NIC>(
	subLookup: Map<K, S>,
	catLookup: Map<K, C>,
	mapFn: (sub: S, cat: C) => { ratePlans: RP[]; productsNotInCatalog: NIC[] },
): { ratePlans: RP[]; productsNotInCatalog: NIC[] } {
	const items = joinAllLeft(subLookup, catLookup).map(([sub, cat]) =>
		mapFn(sub, cat),
	);
	return {
		ratePlans: items.flatMap((item) => item.ratePlans),
		productsNotInCatalog: items.flatMap((item) => item.productsNotInCatalog),
	};
}
