import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs from 'dayjs';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type ZuoraSubscribeResponse,
	zuoraSubscribeResponseSchema,
} from '@modules/zuora/zuoraSchemas';
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

export const createContribution = async (
	zuoraClient: ZuoraClient,
	price?: number,
): Promise<string> => {
	const subscribeResponse = await subscribe(
		zuoraClient,
		contributionSubscribeBody(dayjs(), price),
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
			PaymentMethod: {
				BankTransferAccountName: string;
				Type: string;
				BankTransferAccountNumber: string;
				FirstName: string;
				PaymentGateway: string;
				BankTransferType: string;
				Country: string;
				BankCode: string;
				LastName: string;
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
