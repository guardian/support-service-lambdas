import { BillingPeriod } from '@modules/billingPeriod';
import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '../utils/common';

export type TriggerDates = [
	{
		name: 'ContractEffective';
		triggerDate: string;
	},
	{
		name: 'ServiceActivation';
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
	renewSubscription: object;
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
			initialTerm: {
				period: number;
				periodType: BillingPeriod;
				termType: 'TERMED';
			};
			renewalSetting: 'RENEW_WITH_SPECIFIC_TERM';
			renewalTerms: [
				{
					period: 12;
					periodType: 'Month';
				},
			];
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
			name: 'ServiceActivation',
			triggerDate: zuoraDateFormat(applyFromDate),
		},
		{
			name: 'CustomerAcceptance',
			triggerDate: zuoraDateFormat(applyFromDate),
		},
	];
}
