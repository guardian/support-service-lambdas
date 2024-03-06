import { getProductRatePlan } from '@modules/product-catalog/productCatalogMapping';
import { zuoraDateFormat } from '@modules/zuora/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscribeResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSubscribeResponseSchema } from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

type SubscribeItem = {
	productRatePlanId: string;
	chargeOverride?: {
		productRatePlanChargeId: string;
		price: number;
	};
};
export const createSubscribeBody = (
	subscribeItems: SubscribeItem[],
	subscriptionDate: Dayjs,
) => {
	const ratePlanData = subscribeItems.map((subscribeItem) => {
		const chargeOverride = subscribeItem.chargeOverride
			? {
					RatePlanChargeData: [
						{
							RatePlanCharge: {
								ProductRatePlanChargeId:
									subscribeItem.chargeOverride.productRatePlanChargeId,
								Price: subscribeItem.chargeOverride.price,
								EndDateCondition: 'SubscriptionEnd',
							},
						},
					],
			  }
			: {};

		return {
			RatePlan: {
				ProductRatePlanId: subscribeItem.productRatePlanId,
			},
			...chargeOverride,
			SubscriptionProductFeatureList: [],
		};
	});

	return {
		subscribes: [
			{
				Account: {
					Name: 'Test User',
					Currency: 'GBP',
					CrmId: '0019E00002QSysUQAT', // The Saleforce Account ID
					IdentityId__c: '200175946',
					PaymentGateway: 'GoCardless',
					CreatedRequestId__c: '17d9e675-4198-c0b0-0000-00000001280e',
					BillCycleDay: 0,
					AutoPay: true,
					PaymentTerm: 'Due Upon Receipt',
					BcdSettingOption: 'AutoSet',
					Batch: 'Batch1',
					InvoiceTemplateId: '2c92c0f849369b8801493bf7db7e450e',
					sfContactId__c: '0039E00001rm02wQAA',
				},
				BillToContact: {
					FirstName: 'Test',
					LastName: 'User',
					WorkEmail: 'test.user@thegulocal.com',
					Country: 'GB',
				},
				PaymentMethod: {
					FirstName: 'Test',
					LastName: 'User',
					BankTransferAccountName: 'Test User',
					BankCode: '200000',
					BankTransferAccountNumber: '55779911',
					Country: 'GB',
					BankTransferType: 'DirectDebitUK',
					Type: 'BankTransfer',
					PaymentGateway: 'GoCardless',
				},
				SubscriptionData: {
					RatePlanData: ratePlanData,
					Subscription: {
						ContractEffectiveDate: zuoraDateFormat(subscriptionDate),
						ContractAcceptanceDate: zuoraDateFormat(
							subscriptionDate.add(16, 'day'),
						),
						TermStartDate: zuoraDateFormat(subscriptionDate),
						AutoRenew: true,
						InitialTermPeriodType: 'Month',
						InitialTerm: 12,
						RenewalTerm: 12,
						TermType: 'TERMED',
						ReaderType__c: 'Direct',
					},
				},
				SubscribeOptions: { GenerateInvoice: true, ProcessPayments: true },
			},
		],
	};
};

const stage = 'CODE';
export const createAccountAndSubscription = async (
	zuoraClient: ZuoraClient,
): Promise<ZuoraSubscribeResponse> => {
	const path = `/v1/action/subscribe`;
	const subscribeItems = [
		{
			productRatePlanId: getProductRatePlan(
				stage,
				'Digital',
				'DigitalSubscription',
				'Monthly',
			).id as string,
		},
	];
	const today = dayjs();
	const body = JSON.stringify(createSubscribeBody(subscribeItems, today));

	return zuoraClient.post(path, body, zuoraSubscribeResponseSchema);
};

void (async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const response = await createAccountAndSubscription(zuoraClient);
	console.log(response);
})();
