import { ProductKey } from '@modules/product-catalog/productCatalog';
import { BillingPeriod } from '@modules/billingPeriod';
import { isInList } from '@modules/arrayFunctions';

export const validTargetGuardianProductNames = [
	'SupporterPlus',
	'DigitalSubscription',
] satisfies readonly [ProductKey, ...ProductKey[]];

export type ValidTargetGuardianProductName =
	(typeof validTargetGuardianProductNames)[number];

export const validTargetZuoraBillingPeriods = ['Annual', 'Month'] as const;
export type ValidTargetZuoraBillingPeriod =
	(typeof validTargetZuoraBillingPeriods)[number];

export const isValidSwitchableBillingPeriod = (
	bp: BillingPeriod,
): bp is ValidTargetZuoraBillingPeriod =>
	isInList(validTargetZuoraBillingPeriods)(bp);

export const switchesForProduct = {
	Contribution: {
		SupporterPlus: ['Annual', 'Month'] as const,
	},
	SupporterPlus: { DigitalSubscription: ['Annual', 'Month'] as const },
} satisfies Partial<
	Record<
		ProductKey,
		Partial<
			Record<
				ValidTargetGuardianProductName,
				readonly ValidTargetZuoraBillingPeriod[]
			>
		>
	>
>;

export type ValidTargetProductNameFor<
	T extends keyof typeof switchesForProduct,
> = keyof (typeof switchesForProduct)[T];

export type SwitchableProduct = keyof typeof switchesForProduct;

export const isSwitchFromSupported = (
	productKeyToCheck: ProductKey,
): productKeyToCheck is keyof typeof switchesForProduct =>
	productKeyToCheck in switchesForProduct;

type TargetSwitchMap = Partial<
	Record<
		ValidTargetGuardianProductName,
		readonly ValidTargetZuoraBillingPeriod[]
	>
>;

export const isSwitchToSupported = <
	S extends TargetSwitchMap,
	K extends ValidTargetGuardianProductName,
>(
	switches: S,
	target: K,
): switches is S & Record<K, readonly ValidTargetZuoraBillingPeriod[]> =>
	target in switches;
