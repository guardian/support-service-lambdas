import type { BillingPeriod } from '@modules/billingPeriod';
import type { TermType } from '@modules/product-catalog/productCatalog';
import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '../utils/common';

export type TriggerDates = [
	{
		name: 'ContractEffective';
		triggerDate: string;
	},
	{
		name: 'CustomerAcceptance';
		triggerDate: string;
	},
];

export type OrderActionType =
	| 'ChangePlan'
	| 'TermsAndConditions'
	| 'RenewSubscription'
	| 'UpdateProduct'
	| 'CreateSubscription'
	| 'AddProduct';

type BaseOrderAction = {
	type: OrderActionType;
	triggerDates: TriggerDates;
};

export type ChangePlanOrderAction = BaseOrderAction & {
	type: 'ChangePlan';
	changePlan: {
		productRatePlanId: string;
		subType: 'Upgrade';
		newProductRatePlan: {
			productRatePlanId: string;
			chargeOverrides: [
				{
					productRatePlanChargeId: string;
					pricing: {
						recurringFlatFee: {
							listPrice: number;
						};
					};
				},
			];
		};
	};
};
export type DiscountOrderAction = BaseOrderAction & {
	type: 'AddProduct';
	addProduct: {
		productRatePlanId: string;
	};
};
export type UpdateProductOrderAction = BaseOrderAction & {
	type: 'UpdateProduct';
	updateProduct: {
		ratePlanId: string;
		chargeUpdates: [
			{
				chargeNumber: string;
				pricing: {
					recurringFlatFee: {
						listPrice: number;
					};
				};
			},
		];
	};
};
export type RenewSubscriptionOrderAction = BaseOrderAction & {
	type: 'RenewSubscription';
};
export type TermsAndConditionsOrderAction = BaseOrderAction & {
	type: 'TermsAndConditions';
	termsAndConditions: {
		lastTerm: {
			termType: 'TERMED';
			endDate: string;
		};
	};
};
export type CreateSubscriptionOrderAction = BaseOrderAction & {
	type: 'CreateSubscription';
	createSubscription: {
		terms: {
			autoRenew: boolean;
			initialTerm: {
				period: number;
				periodType: BillingPeriod;
				termType: 'TERMED';
			};
			renewalSetting: 'RENEW_WITH_SPECIFIC_TERM';
			renewalTerms: Array<{
				period: number;
				periodType: BillingPeriod;
			}>;
		};
		subscribeToRatePlans: [
			{
				productRatePlanId: string;
				chargeOverrides?: Array<{
					productRatePlanChargeId: string;
					pricing: {
						recurringFlatFee: {
							listPrice: number;
						};
					};
				}>;
			},
		];
	};
	customFields?: {
		DeliveryAgent__c: string | undefined;
		ReaderType__c: string;
	};
};
export type OrderAction =
	| ChangePlanOrderAction
	| RenewSubscriptionOrderAction
	| TermsAndConditionsOrderAction
	| UpdateProductOrderAction
	| DiscountOrderAction
	| CreateSubscriptionOrderAction;

export function singleTriggerDate(applyFromDate: Dayjs): TriggerDates {
	return [
		{
			name: 'ContractEffective',
			triggerDate: zuoraDateFormat(applyFromDate),
		},
		{
			name: 'CustomerAcceptance',
			triggerDate: zuoraDateFormat(applyFromDate),
		},
	];
}

export function initialTermInDays(
	contractEffectiveDate: Dayjs,
	customerAcceptanceDate: Dayjs,
	termLength: number,
) {
	// This functionality is ported over from the previous version of this code.
	// I think the reason we need the term in days is because for delivery products
	// the term starts on the contract effective date (when the order is placed)
	// but the customer acceptance date (when the first delivery is made) can be
	// some days later. We need to ensure that the term covers the full period
	// from contract effective date to [termLength] after customer acceptance date.
	const termEnd = customerAcceptanceDate.add(termLength, 'month');
	return termEnd.diff(contractEffectiveDate, 'day');
}

// Builder function to simplify the creation of a CreateSubscriptionOrderAction
// object as a lot of it is boilerplate.
export function buildCreateSubscriptionOrderAction({
	productRatePlanId,
	contractEffectiveDate,
	customerAcceptanceDate,
	chargeOverride,
	termType,
	termLengthInMonths,
}: {
	productRatePlanId: string;
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate: Dayjs;
	chargeOverride?: { productRatePlanChargeId: string; overrideAmount: number };
	termType: TermType;
	termLengthInMonths: number;
}): CreateSubscriptionOrderAction {
	const chargeOverrides = chargeOverride
		? [
				{
					productRatePlanChargeId: chargeOverride.productRatePlanChargeId,
					pricing: {
						recurringFlatFee: {
							listPrice: chargeOverride.overrideAmount,
						},
					},
				},
			]
		: [];

	const [initialPeriodLength, initialPeriodType, autoRenew] =
		termType === 'Recurring'
			? [12, 'Month', true]
			: [
					initialTermInDays(
						contractEffectiveDate,
						customerAcceptanceDate,
						termLengthInMonths,
					),
					'Days',
					false,
				];

	const terms = {
		autoRenew: autoRenew,
		initialTerm: {
			period: initialPeriodLength,
			periodType: initialPeriodType as BillingPeriod,
			termType: 'TERMED' as const,
		},
		renewalSetting: 'RENEW_WITH_SPECIFIC_TERM' as const,
		renewalTerms: [
			{
				period: termLengthInMonths,
				periodType: 'Month' as BillingPeriod,
			},
		],
	};

	return {
		type: 'CreateSubscription',
		triggerDates: [
			{
				name: 'ContractEffective',
				triggerDate: zuoraDateFormat(contractEffectiveDate),
			},
			{
				name: 'CustomerAcceptance',
				triggerDate: zuoraDateFormat(customerAcceptanceDate),
			},
		],
		createSubscription: {
			terms: terms,
			subscribeToRatePlans: [
				{
					productRatePlanId,
					chargeOverrides,
				},
			],
		},
	};
}
