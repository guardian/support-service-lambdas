import { zuoraDateFormat } from '@modules/zuora/common';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ZuoraSubscribeResponse } from '@modules/zuora/zuoraSchemas';
import { zuoraSubscribeResponseSchema } from '@modules/zuora/zuoraSchemas';
import type { Dayjs } from 'dayjs';

type SubscribeItem = {
	productRatePlanId: string;
	chargeOverride?: {
		productRatePlanChargeId: string;
		price: number;
	};
};

type SubscriptionDetails = {
	contractEffectiveDate: Dayjs;
	customerAcceptanceDate: Dayjs;
	firstName: string;
	lastName: string;
	email: string;
	subscribeItems: SubscribeItem[];
};
export const createSubscribeBody = ({
	contractEffectiveDate,
	customerAcceptanceDate,
	firstName,
	lastName,
	email,
	subscribeItems,
}: SubscriptionDetails) => {
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
					Name: `${firstName} ${lastName}`,
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
					FirstName: firstName,
					LastName: lastName,
					WorkEmail: email,
					Country: 'GB',
				},
				PaymentMethod: {
					FirstName: firstName,
					LastName: lastName,
					BankTransferAccountName: `${firstName} ${lastName}`,
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
						ContractEffectiveDate: zuoraDateFormat(contractEffectiveDate),
						ContractAcceptanceDate: zuoraDateFormat(customerAcceptanceDate),
						TermStartDate: zuoraDateFormat(contractEffectiveDate),
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

export const createAccountAndSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionDetails: SubscriptionDetails,
): Promise<ZuoraSubscribeResponse> => {
	const path = `/v1/action/subscribe`;
	const body = JSON.stringify(createSubscribeBody(subscriptionDetails));
	return zuoraClient.post(path, body, zuoraSubscribeResponseSchema);
};
