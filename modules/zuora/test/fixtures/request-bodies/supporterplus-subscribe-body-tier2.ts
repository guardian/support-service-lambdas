import type { Dayjs } from 'dayjs';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/utils';

export const supporterPlusSubscribeBody = (
	subscriptionDate: Dayjs,
	productCatalog: ProductCatalog,
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
								ProductRatePlanId:
									productCatalog.SupporterPlus.ratePlans.Monthly.id,
							},
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
					},
				},
				SubscribeOptions: { GenerateInvoice: true, ProcessPayments: true },
			},
		],
	};
};
