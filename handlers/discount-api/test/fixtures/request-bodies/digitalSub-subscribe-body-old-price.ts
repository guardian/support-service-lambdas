import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '../../../src/zuora/common';

export const digiSubSubscribeBody = (
	subscriptionDate: Dayjs,
	createWithOldPrice: boolean,
) => {
	const chargeOverride = createWithOldPrice
		? {
				RatePlanChargeData: [
					{
						RatePlanCharge: {
							ProductRatePlanChargeId: '2c92c0f84bbfec58014bc6a2c37e1f15',
							Price: 11.99,
							EndDateCondition: 'SubscriptionEnd',
						},
					},
				],
		  }
		: {};
	return {
		subscribes: [
			{
				Account: {
					Name: '0019E00002QSysUQAT',
					Currency: 'GBP',
					CrmId: '0019E00002QSysUQAT',
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
					FirstName: 'Rupert',
					LastName: 'Bates',
					BankTransferAccountName: 'blah',
					BankCode: '200000',
					BankTransferAccountNumber: '55779911',
					Country: 'GB',
					BankTransferType: 'DirectDebitUK',
					Type: 'BankTransfer',
					PaymentGateway: 'GoCardless',
				},
				SubscriptionData: {
					RatePlanData: [
						{
							RatePlan: {
								ProductRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
							},
							...chargeOverride,
							SubscriptionProductFeatureList: [],
						},
					],
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
						CreatedRequestId__c: '17d9e675-4198-c0b0-0000-00000001280e',
					},
				},
				SubscribeOptions: { GenerateInvoice: true, ProcessPayments: true },
			},
		],
	};
};
