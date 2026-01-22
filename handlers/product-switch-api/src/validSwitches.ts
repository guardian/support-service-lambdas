import {
	ProductKey,
	ProductRatePlanKey,
} from '@modules/product-catalog/productCatalog';
import { isInList } from '@modules/arrayFunctions';
import { GuardianCatalogKeys } from './changePlan/getSinglePlanFlattenedSubscriptionOrThrow';

const validSwitches = {
	Contribution: { Annual: ['SupporterPlus'], Monthly: ['SupporterPlus'] },
	SupporterPlus: {
		Annual: ['DigitalSubscription'],
		Monthly: ['DigitalSubscription'],
	},
} as const satisfies {
	[P in ProductKey]?: Partial<
		Record<ProductRatePlanKey<P>, readonly [ProductKey, ...ProductKey[]]>
	>;
};

// TODO:delete comment - Extract all possible target product names from validSwitches
type AllTargetGuardianProductNames = {
	[P in keyof typeof validSwitches]: (typeof validSwitches)[P] extends infer Plans extends
		Record<string, readonly ProductKey[]>
		? Plans[keyof Plans][number]
		: never;
}[keyof typeof validSwitches];

export const validTargetProductKeys = [
	'SupporterPlus',
	'DigitalSubscription',
] as const satisfies readonly [
	AllTargetGuardianProductNames,
	...AllTargetGuardianProductNames[],
];

export type ValidTargetProductKey = (typeof validTargetProductKeys)[number];

// TODO:delete comment - Extract all billing periods that appear as keys inside validSwitches
type AllRatePlanKeys = {
	[P in keyof typeof validSwitches]: keyof (typeof validSwitches)[P];
}[keyof typeof validSwitches];

export const validRatePlanKeys = [
	'Annual',
	'Monthly',
] as const satisfies readonly [AllRatePlanKeys, ...AllRatePlanKeys[]];

export type ValidRatePlanKey = (typeof validRatePlanKeys)[number];

export const isValidSwitchableRatePlanKey = (
	bp: string,
): bp is ValidRatePlanKey => isInList(validRatePlanKeys)(bp);

const typedValidSwitches: {
	[P in ProductKey]?: Partial<
		Record<
			ProductRatePlanKey<P>,
			readonly [ValidTargetProductKey, ...ValidTargetProductKey[]]
		>
	>;
} = validSwitches;

export const getValidTargetProducts = <P extends ProductKey>(
	keys: GuardianCatalogKeys<P>,
): readonly [ValidTargetProductKey, ...ValidTargetProductKey[]] | undefined => {
	const { productKey, productRatePlanKey } = keys;
	return typedValidSwitches[productKey]?.[productRatePlanKey];
};
