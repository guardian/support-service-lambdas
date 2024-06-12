import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	ZuoraSubscribeResponse,
	ZuoraSubscription,
	ZuoraSuccessResponse,
} from '@modules/zuora/zuoraSchemas';
import {
	zuoraSubscribeResponseSchema,
	zuoraSuccessResponseSchema,
} from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { digiSubSubscribeBody } from './fixtures/request-bodies/digitalSub-subscribe-body-old-price';
import { updateSubscriptionBody } from './fixtures/request-bodies/update-subscription-body';
import { checkDefined } from '@modules/nullAndUndefined';
import { supporterPlusSubscribeBody } from './fixtures/request-bodies/supporterplus-subscribe-body-tier2';

export const createDigitalSubscription = async (
	zuoraClient: ZuoraClient,
	createWithOldPrice: boolean,
): Promise<string> => {
	const subscribeResponse = await subscribe(
		zuoraClient,
		digiSubSubscribeBody(dayjs(), createWithOldPrice),
	);
	return checkDefined(
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

	return checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);
};

async function subscribe(
	zuoraClient: ZuoraClient,
	subscribeBody: {
		subscribes: {
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
				RatePlanData: {
					RatePlan: { ProductRatePlanId: string };
					SubscriptionProductFeatureList: any[];
				}[];
				Subscription: {
					ContractEffectiveDate: string;
					ContractAcceptanceDate: string;
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
		}[];
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

export const doPriceRise = async (
	zuoraClient: ZuoraClient,
	subscription: ZuoraSubscription,
	contractEffectiveDate: Dayjs,
): Promise<ZuoraSuccessResponse> => {
	const path = `/v1/subscriptions/${subscription.subscriptionNumber}`;
	const ratePlanId = subscription.ratePlans[0]?.id;
	if (!ratePlanId) {
		throw new Error('RatePlanId was undefined in response from Zuora');
	}
	const body = JSON.stringify(
		updateSubscriptionBody(contractEffectiveDate, ratePlanId),
	);
	return zuoraClient.put(path, body, zuoraSuccessResponseSchema);
};
