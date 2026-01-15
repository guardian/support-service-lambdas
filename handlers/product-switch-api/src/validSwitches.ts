import { ProductKey } from '@modules/product-catalog/productCatalog';
import { BillingPeriod } from '@modules/billingPeriod';
import { isInList } from '@modules/arrayFunctions';

export const validTargetGuardianProductNames = [
	'SupporterPlus',
	// 'DigitalSubscription',
] satisfies readonly [ProductKey, ...ProductKey[]];

export type ValidTargetGuardianProductName =
	(typeof validTargetGuardianProductNames)[number];

export const validTargetZuoraBillingPeriods = ['Annual', 'Month'] as const;
export type ValidTargetZuoraBillingPeriod =
	(typeof validTargetZuoraBillingPeriods)[number];

export const isValidTargetBillingPeriod = (
	bp: BillingPeriod,
): bp is ValidTargetZuoraBillingPeriod =>
	isInList(validTargetZuoraBillingPeriods)(bp);

export const switchesForProduct = {
	Contribution: {
		SupporterPlus: ['Annual', 'Month'] as const,
	},
} satisfies Partial<
	Record<
		ProductKey,
		Record<ValidTargetGuardianProductName, ValidTargetZuoraBillingPeriod[]>
	>
>;

export type SwitchableProduct = keyof typeof switchesForProduct;

export const isProductSupported = (
	productKeyToCheck: ProductKey,
): productKeyToCheck is keyof typeof switchesForProduct =>
	productKeyToCheck in switchesForProduct;

export const isTargetSupported = (
	cur: Record<
		ValidTargetGuardianProductName,
		{ validBillingPeriods: ValidTargetZuoraBillingPeriod[] }
	>,
	targetProductToCheck: ValidTargetGuardianProductName,
): targetProductToCheck is keyof typeof cur => targetProductToCheck in cur;
