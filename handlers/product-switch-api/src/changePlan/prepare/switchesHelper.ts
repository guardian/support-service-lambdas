import { distinct, getIfNonEmpty, isInList } from '@modules/arrayFunctions';
import { getIfDefined } from '@modules/nullAndUndefined';
import { objectKeys, objectValues } from '@modules/objectFunctions';
import type {
	Normalize,
	ProductKey,
	ProductRatePlan,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { productSwitchesData } from '../switchDefinition/productSwitchesData';
import type { SwitchActionData, TargetInformation } from './targetInformation';

export type ValidSwitchHandler<
	P extends ProductKey,
	RPK extends ProductRatePlanKey<P>,
> = (
	ratePlan: ProductRatePlan<P, RPK>,
	switchActionData: SwitchActionData,
) => Promise<TargetInformation>;

type ValidSwitchToProduct<P extends ProductKey> = {
	[RPK in ProductRatePlanKey<P>]?: ValidSwitchHandler<P, RPK>;
};

export type ValidSwitchesFromRatePlan = {
	[P in ProductKey]?: ValidSwitchToProduct<P>;
};

type ValidSwitchFromProduct<P extends ProductKey> = Partial<
	Record<ProductRatePlanKey<P>, ValidSwitchesFromRatePlan>
>;

export type ValidSwitches = {
	[P in ProductKey]?: ValidSwitchFromProduct<P>;
};

export type ValidSwitchFromKeys = keyof typeof productSwitchesData & ProductKey;

export function getAvailableSwitchesFrom<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
>(productKey: P, productRatePlanKey: PRP) {
	const widenedValidSwitches: ValidSwitches = productSwitchesData;
	const validSwitch2: ValidSwitchFromProduct<P> | undefined =
		widenedValidSwitches[productKey];
	const validSwitch1: ValidSwitchFromProduct<P> = getIfDefined(
		validSwitch2,
		`couldn't find a switch from ${productKey}`,
	);
	const validSwitch: ValidSwitchesFromRatePlan | undefined =
		validSwitch1[productRatePlanKey];
	return getIfDefined(
		validSwitch,
		`couldn't find a switch from ${productKey} for ${productRatePlanKey}`,
	);
}

export function getSwitchTo<
	P extends ProductKey,
	PRP extends ProductRatePlanKey<P>,
>(
	validSwitches: ValidSwitchesFromRatePlan,
	productKey: P,
	productRatePlanKey: PRP,
	msg: string,
) {
	const widenedValidSwitches: ValidSwitchesFromRatePlan = validSwitches;
	const validSwitch2: ValidSwitchToProduct<P> | undefined =
		widenedValidSwitches[productKey];
	const validSwitch1: ValidSwitchToProduct<P> = getIfDefined(
		validSwitch2,
		`couldn't find a switch from ${msg} to ${productKey}`,
	);
	const validSwitch: ValidSwitchHandler<P, PRP> | undefined =
		validSwitch1[productRatePlanKey];
	return getIfDefined(
		validSwitch,
		`couldn't find a switch from ${msg} ${productKey} to ${productRatePlanKey}`,
	);
}

export type ValidTargetProduct = Normalize<
	{
		[P in keyof typeof productSwitchesData]: {
			[P2 in keyof (typeof productSwitchesData)[P]]: keyof (typeof productSwitchesData)[P][P2];
		}[keyof (typeof productSwitchesData)[P]];
	}[keyof typeof productSwitchesData]
>;

export const validTargetProductKeys: [
	ValidTargetProduct,
	...ValidTargetProduct[],
] = getIfNonEmpty(
	distinct(
		objectValues(productSwitchesData)
			.flatMap(objectValues)
			.flatMap((value): ValidTargetProduct[] => objectKeys(value)),
	),
	'todo',
);

export type ValidSwitchableRatePlanKey = Normalize<
	{
		[P in keyof typeof productSwitchesData]: keyof (typeof productSwitchesData)[P];
	}[keyof typeof productSwitchesData]
>;

const validSwitchableRatePlanKeys = getIfNonEmpty(
	distinct(
		objectValues(productSwitchesData).flatMap((value) => objectKeys(value)),
	),
	'todo',
);

export const isValidSwitchableRatePlanKey = (
	bp: string,
): bp is ValidSwitchableRatePlanKey =>
	isInList(validSwitchableRatePlanKeys)(bp);
