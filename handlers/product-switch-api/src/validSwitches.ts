import { ProductKey } from '@modules/product-catalog/productCatalog';
import { BillingPeriod } from '@modules/billingPeriod';
import { isInList } from '@modules/arrayFunctions';

export const validTargetProducts = [
	'SupporterPlus',
	// 'DigitalSubscription',
] satisfies readonly [ProductKey, ...ProductKey[]];

export type ValidTargetProduct = (typeof validTargetProducts)[number];

export const validTargetBillingPeriod = ['Annual', 'Month'] as const;
export type ValidTargetBillingPeriod =
	(typeof validTargetBillingPeriod)[number];

export const isValidTargetBillingPeriod = (
	bp: BillingPeriod,
): bp is ValidTargetBillingPeriod => isInList(validTargetBillingPeriod)(bp);

//
// // use productBillingPeriods.ts instead?
// type ValidBillingPeriodForSwitch<F extends ProductKey, T extends ProductKey> = {
// 	[FPRP in ProductRatePlanKey<F>]: FPRP extends ProductRatePlanKey<T>
// 		? FPRP
// 		: never;
// }[ProductRatePlanKey<F>];
//
// type SwitchConfiguration<F extends ProductKey, T extends ProductKey> = {
// 	sourceProduct: F;
// 	targetProduct: T;
// 	validBillingPeriods: ReadonlyArray<ValidBillingPeriodForSwitch<F, T>>;
// };
//
// type SwitchObject<F extends ProductKey, T extends ValidTargetProduct> = {
// 	[X in T]: SwitchConfiguration<F, T>;
// };
//
// const toSupporterPlus: SwitchObject<'Contribution', 'SupporterPlus'> = {
// 	SupporterPlus: {
// 		sourceProduct: 'Contribution',
// 		targetProduct: 'SupporterPlus',
// 		validBillingPeriods: ['Annual', 'Monthly'],
// 	},
// };
//
// export const validSwitches = {
// 	...toSupporterPlus,
// 	// ...{DigitalSubscription: 'test2'},
// };
export const switchesForProduct = {
	Contribution: {
		SupporterPlus: {
			validBillingPeriods: ['Annual', 'Month'], // todo types
		},
	},
} satisfies Partial<
	Record<
		ProductKey,
		Record<
			ValidTargetProduct,
			{ validBillingPeriods: ValidTargetBillingPeriod[] }
		>
	>
>;

export type SwitchableProduct = keyof typeof switchesForProduct;
