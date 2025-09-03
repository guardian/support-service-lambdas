import type { BillingPeriod } from '@modules/billingPeriod';
import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '../utils/common';
import { TermType } from '@modules/product-catalog/productCatalog';

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
			renewalSetting?: 'RENEW_WITH_SPECIFIC_TERM';
			renewalTerms?: {
				period: number;
				periodType: BillingPeriod;
			}[];
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

// Builder function to simplify the creation of a CreateSubscriptionOrderAction
// object as a lot of it is boilerplate.
export function buildCreateSubscriptionOrderAction({
	productRatePlanId,
	contractEffectiveDate,
	customerAcceptanceDate,
	chargeOverride,
	termType,
	termLength,
}: {
	productRatePlanId: string;
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate?: Dayjs;
	chargeOverride?: { productRatePlanChargeId: string; overrideAmount: number };
	termType: TermType;
	termLength: number;
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

	const terms =
		termType === 'Recurring'
			? {
					autoRenew: true,
					initialTerm: {
						period: 12,
						periodType: 'Month' as BillingPeriod,
						termType: 'TERMED' as const,
					},
					renewalSetting: 'RENEW_WITH_SPECIFIC_TERM' as const,
					renewalTerms: [
						// TODO: is this needed if it's the same as initial term?
						{
							period: 12,
							periodType: 'Month' as BillingPeriod,
						},
					],
				}
			: {
					autoRenew: false,
					initialTerm: {
						period: termLength,
						periodType: 'Month' as BillingPeriod, // TODO: Days for GW gifts?
						termType: 'TERMED' as const,
					},
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
				triggerDate: zuoraDateFormat(
					customerAcceptanceDate ?? contractEffectiveDate,
				),
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
