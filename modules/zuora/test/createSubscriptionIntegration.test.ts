import {
	CreateSubscriptionOrderAction,
	singleTriggerDate,
} from '@modules/zuora/orders/orderActions';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createSubscription } from '@modules/zuora/createSubscription';
import dayjs from 'dayjs';
import { Currency } from '@modules/internationalisation/currency';
import { PaymentGateway } from '@modules/zuora/orders/newAccount';
import { PaymentMethod } from '@modules/zuora/orders/newAccount';
import { OrderRequest } from '@modules/zuora/orders/orders';
import { zuoraDateFormat } from '@modules/zuora/utils/common';

test('We can create a subscription with a new account', async () => {
	const newAccount = {
		name: 'Integration test',
		currency: 'GBP' as Currency,
		billCycleDay: 0,
		autoPay: true,
		paymentGateway: 'GoCardless' as PaymentGateway,
		paymentMethod: {
			accountHolderInfo: {
				accountHolderName: 'RB',
			},
			accountNumber: '55779911',
			bankCode: '200000',
			type: 'Bacs',
		} as PaymentMethod,
		billToContact: {
			firstName: 'John',
			lastName: 'Doe',
			workEmail: 'test@thegulocal.com',
			country: 'GB',
			state: '',
			city: 'London',
			address1: 'Kings Place',
			postalCode: 'N1 9GU',
		},
	};
	const createSubscriptionOrderAction: CreateSubscriptionOrderAction = {
		type: 'CreateSubscription',
		triggerDates: singleTriggerDate(dayjs()),
		createSubscription: {
			terms: {
				initialTerm: {
					period: 12,
					periodType: 'Month',
					termType: 'TERMED',
				},
				renewalSetting: 'RENEW_WITH_SPECIFIC_TERM',
				renewalTerms: [
					{
						period: 12,
						periodType: 'Month',
					},
				],
			},
			subscribeToRatePlans: [
				{
					productRatePlanId: '2c92c0f85a6b134e015a7fcd9f0c7855',
					chargeOverrides: [
						{
							productRatePlanChargeId: '2c92c0f85a6b1352015a7fcf35ab397c',
							pricing: {
								recurringFlatFee: {
									listPrice: 8.99,
								},
							},
						},
					],
				},
			],
		},
	};
	const request: OrderRequest = {
		newAccount: newAccount,
		orderDate: zuoraDateFormat(dayjs()),
		subscriptions: [
			{
				orderActions: [createSubscriptionOrderAction],
			},
		],
	};

	const client = await ZuoraClient.create('CODE');
	const response = await createSubscription(client, request);
	console.log(JSON.stringify(response));
});
