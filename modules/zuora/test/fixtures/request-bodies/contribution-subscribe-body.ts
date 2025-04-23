import type { Dayjs } from 'dayjs';
import { zuoraDateFormat } from '@modules/zuora/common';
import { catalog } from '../../../../../handlers/discount-api/src/productToDiscountMapping';
import type { ContributionTestAdditionalOptions } from '../../it-helpers/createGuardianSubscription';

export const contributionSubscribeBody = (
	subscriptionDate: Dayjs,
	additionOptions?: ContributionTestAdditionalOptions,
) => {
	const paymentOptions = {
		directDebit: {
			FirstName: 'first',
			LastName: 'last',
			BankTransferAccountName: 'blah',
			BankCode: '200000',
			BankTransferAccountNumber: '55779911',
			Country: additionOptions?.billingCountry ?? 'United Kingdom',
			BankTransferType: 'DirectDebitUK',
			Type: 'BankTransfer',
			PaymentGateway: 'GoCardless',
		},
		visaCard: {
			TokenId: 'card_E0zitFfsO2wTEn',
			SecondTokenId: 'cus_E0zic0cedDT5MZ',
			CreditCardNumber: '4242',
			CreditCardCountry: 'GB',
			CreditCardExpirationMonth: 2,
			CreditCardExpirationYear: 2029,
			CreditCardType: 'Visa',
			Type: 'CreditCardReferenceTransaction',
			PaymentGateway: 'Stripe Gateway 1',
		},
	};
	return {
		subscribes: [
			{
				Account: {
					Name: '0019E00002QSysUQAT',
					Currency: 'GBP',
					CrmId: '0019E00002QSysUQAT',
					IdentityId__c: '200175946',
					PaymentGateway:
						paymentOptions[additionOptions?.paymentMethod ?? 'directDebit']
							.PaymentGateway,
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
					...paymentOptions[additionOptions?.paymentMethod ?? 'directDebit'],
				},
				SubscriptionData: {
					RatePlanData: [
						{
							RatePlan: {
								ProductRatePlanId:
									catalog.CODE.recurringContribution[
										additionOptions?.billingPeriod ?? 'Annual'
									],
							},
							RatePlanChargeData: [
								{
									RatePlanCharge: {
										Price: additionOptions?.price ?? 100,
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
