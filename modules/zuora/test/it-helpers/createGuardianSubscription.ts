import { getIfDefined } from '@modules/nullAndUndefined';
import {
	type ZuoraSubscribeResponse,
	zuoraSubscribeResponseSchema,
} from '@modules/zuora/types';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { contributionSubscribeBody } from '../fixtures/request-bodies/contribution-subscribe-body';
import { digiSubSubscribeBody } from '../fixtures/request-bodies/digitalSub-subscribe-body-old-price';
import { supporterPlusSubscribeBody } from '../fixtures/request-bodies/supporterplus-subscribe-body-tier2';

export const createDigitalSubscription = async (
	zuoraClient: ZuoraClient,
	createWithOldPrice: boolean,
): Promise<string> => {
	const subscribeResponse = await subscribe(
		zuoraClient,
		digiSubSubscribeBody(dayjs(), createWithOldPrice),
	);
	return getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);
};

export const createSupporterPlusSubscription = async (
	zuoraClient: ZuoraClient,
): Promise<string> => {
	const subscribeResponse = await subscribe(
		zuoraClient,
		supporterPlusSubscribeBody(dayjs()),
	);

	return getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);
};

export type ContributionTestBillingPeriod = 'Month' | 'Annual';
export type ContributionTestBillingCountry =
	| 'United Kingdom'
	| 'Germany'
	| 'United States'; // https://knowledgecenter.zuora.com/Quick_References/Country%2C_State%2C_and_Province_Codes/A_Manage_countries_and_regions#View_countries_or_regions (countries are defined in Zuora config)
export interface ContributionTestAdditionalOptions {
	billingPeriod?: ContributionTestBillingPeriod;
	price?: number;
	billingCountry?: 'United Kingdom' | 'Germany' | 'United States'; // https://knowledgecenter.zuora.com/Quick_References/Country%2C_State%2C_and_Province_Codes/A_Manage_countries_and_regions#View_countries_or_regions (countries are defined in Zuora config)
	paymentMethod?: 'directDebit' | 'visaCard';
}

export const createContribution = async (
	zuoraClient: ZuoraClient,
	additionOptions?: ContributionTestAdditionalOptions,
): Promise<string> => {
	const subscribeResponse = await subscribe(
		zuoraClient,
		contributionSubscribeBody(dayjs(), additionOptions),
	);
	return getIfDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);
};

async function subscribe(
	zuoraClient: ZuoraClient,
	subscribeBody: {
		subscribes: Array<{
			Account: {
				IdentityId__c: string;
				InvoiceTemplateId: string;
				AutoPay: boolean;
				PaymentTerm: string;
				CreatedRequestId__c: string;
				Name: string;
				sfContactId__c: string;
				Batch: string;
				PaymentGateway: string;
				Currency: string;
				BcdSettingOption: string;
				BillCycleDay: number;
				CrmId: string;
			};
			SubscribeOptions: { GenerateInvoice: boolean; ProcessPayments: boolean };
			SubscriptionData: {
				RatePlanData: Array<{
					RatePlan: { ProductRatePlanId: string };
					SubscriptionProductFeatureList: unknown[];
				}>;
				Subscription: {
					ContractEffectiveDate: string;
					ContractAcceptanceDate: string; // actually CustomerAcceptanceDate but zuora API has a typo
					TermStartDate: string;
					AutoRenew: boolean;
					RenewalTerm: number;
					InitialTerm: number;
					ReaderType__c: string;
					TermType: string;
					CreatedRequestId__c: string;
					InitialTermPeriodType: string;
				};
			};
			PaymentMethod:
				| {
						BankTransferAccountName: string;
						Type: string;
						BankTransferAccountNumber: string;
						FirstName: string;
						PaymentGateway: string;
						BankTransferType: string;
						Country: string;
						BankCode: string;
						LastName: string;
				  }
				| {
						TokenId: string;
						SecondTokenId: string;
						CreditCardNumber: string;
						CreditCardCountry: string;
						CreditCardExpirationMonth: number;
						CreditCardExpirationYear: number;
						CreditCardType: string;
						Type: string;
						PaymentGateway: string;
				  };
			BillToContact: {
				FirstName: string;
				Country: string;
				LastName: string;
				WorkEmail: string;
			};
		}>;
	},
) {
	const path = `/v1/action/subscribe`;
	const body = JSON.stringify(subscribeBody);

	const subscribeResponse: ZuoraSubscribeResponse = await zuoraClient.post(
		path,
		body,
		zuoraSubscribeResponseSchema,
	);
	return subscribeResponse;
}
