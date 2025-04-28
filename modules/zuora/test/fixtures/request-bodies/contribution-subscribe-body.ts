import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '@modules/zuora/common';
import { catalog } from '../../../../../handlers/discount-api/src/productToDiscountMapping';

export const contributionSubscribeBody = (
	subscriptionDate: Dayjs,
	price?: number,
) => {
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
					WorkEmail: 'test.user+zuora-contrib-it-creation@thegulocal.com',
					Country: 'GB',
				},
				PaymentMethod: {
					FirstName: 'first',
					LastName: 'last',
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
								ProductRatePlanId: catalog.CODE.recurringContribution.Annual,
							},
							RatePlanChargeData: [
								{
									RatePlanCharge: {
										Price: price ?? 100,
										ProductRatePlanChargeId: '2c92c0f85e2d19af015e3896e84d092e',
									},
								},
							],
							SubscriptionProductFeatureList: [],
						},
					],
					Subscription: {
						ContractEffectiveDate: zuoraDateFormat(subscriptionDate),
						ContractAcceptanceDate: zuoraDateFormat(subscriptionDate),
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
