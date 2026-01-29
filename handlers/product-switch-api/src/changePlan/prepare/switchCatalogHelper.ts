import {
	distinct,
	getNonEmptyOrThrow,
	isInList,
} from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectKeys, objectValues } from '@modules/objectFunctions';
import type {
	Normalize,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { switchCatalog } from '../switchDefinition/switchCatalog';
import type { SwitchActionData, TargetInformation } from './targetInformation';

export type SwitchTargetInformation<
	P extends ProductKey,
	RPK extends ProductRatePlanKey<P>,
> = {
	fromUserInformation: (
		ratePlan: ProductRatePlan<P, RPK>,
		switchActionData: SwitchActionData,
	) => Promise<TargetInformation>;
};

type AvailableTargetRatePlans<P extends ProductKey> = {
	[RPK in ProductRatePlanKey<P>]?: SwitchTargetInformation<P, RPK>;
};

export type AvailableTargetProducts = {
	[P in ProductKey]?: AvailableTargetRatePlans<P>;
};

type SwitchableRatePlans<P extends ProductKey> = Partial<
	Record<ProductRatePlanKey<P>, AvailableTargetProducts>
>;

export type SwitchCatalog = {
	[P in ProductKey]?: SwitchableRatePlans<P>;
};

export function getAvailableTargetProducts<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
>(productKey: P, productRatePlanKey: PRP): AvailableTargetProducts {
	const widenedValidSwitches: SwitchCatalog = switchCatalog;
	const maybeSwitchableRatePlans: SwitchableRatePlans<P> | undefined =
		widenedValidSwitches[productKey];
	const switchableRatePlans: SwitchableRatePlans<P> = getIfDefined(
		maybeSwitchableRatePlans,
		`couldn't find a switch from ${productKey}`,
	);
	const maybeAvailableTargetProducts: AvailableTargetProducts | undefined =
		switchableRatePlans[productRatePlanKey];
	return getIfDefined(
		maybeAvailableTargetProducts,
		`couldn't find a switch from ${productKey} for ${productRatePlanKey}`,
	);
}

export function getSwitchTargetInformation<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
>(
	switchesFrom: AvailableTargetProducts,
	productKey: P,
	productRatePlanKey: PRP,
	msg: string,
): SwitchTargetInformation<P, PRP> {
	const maybeAvailableTargetRatePlans: AvailableTargetRatePlans<P> | undefined =
		switchesFrom[productKey];
	const availableTargetRatePlans: AvailableTargetRatePlans<P> = getIfDefined(
		maybeAvailableTargetRatePlans,
		`couldn't find a switch from ${msg} to ${productKey}`,
	);
	const maybeSwitchTargetInformation:
		| SwitchTargetInformation<P, PRP>
		| undefined = availableTargetRatePlans[productRatePlanKey];
	return getIfDefined(
		maybeSwitchTargetInformation,
		`couldn't find a switch from ${msg} ${productKey} to ${productRatePlanKey}`,
	);
}

export type ValidTargetProduct = Normalize<
	{
		[P in keyof typeof switchCatalog]: {
			[P2 in keyof (typeof switchCatalog)[P]]: keyof (typeof switchCatalog)[P][P2];
		}[keyof (typeof switchCatalog)[P]];
	}[keyof typeof switchCatalog]
>;

export const validTargetProductKeys: [
	ValidTargetProduct,
	...ValidTargetProduct[],
] = getNonEmptyOrThrow(
	distinct(
		objectValues(switchCatalog)
			.flatMap(objectValues)
			.flatMap((value): ValidTargetProduct[] => objectKeys(value)),
	),
	'productSwitchesData had no target products whatsoever',
);

export type ValidSwitchFromKeys = keyof typeof switchCatalog & ProductKey;

export type ValidSwitchableRatePlanKey = Normalize<
	{
		[P in keyof typeof switchCatalog]: keyof (typeof switchCatalog)[P];
	}[keyof typeof switchCatalog]
>;

const allSwitchableRatePlanKeys = getNonEmptyOrThrow(
	distinct(objectValues(switchCatalog).flatMap((value) => objectKeys(value))),
	'productSwitchesData had no switchable rate plans at all',
);

const isValidSwitchableRatePlanKey = (
	bp: string,
): bp is ValidSwitchableRatePlanKey => isInList(allSwitchableRatePlanKeys)(bp);

export function asSwitchableRatePlanKey(
	productRatePlanKey: string,
): ValidSwitchableRatePlanKey {
	if (!isValidSwitchableRatePlanKey(productRatePlanKey)) {
		throw new Error(`unsupported rate plan key ${productRatePlanKey}`);
	}
	return productRatePlanKey;
}
