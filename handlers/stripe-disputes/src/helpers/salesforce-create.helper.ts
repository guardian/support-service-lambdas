import { sfApiVersion } from '@modules/salesforce/src/config';
import type { SalesforceAuthResponse } from '../types';
import type { PaymentDisputeRecord } from '../interfaces';

export function buildSalesforceUpsertUrl(
	authResponse: SalesforceAuthResponse,
	paymentDispute: PaymentDisputeRecord,
): string {
	return `${authResponse.instance_url}/services/data/${sfApiVersion()}/sobjects/Payment_Dispute__c/Dispute_ID__c/${paymentDispute.Dispute_ID__c}`;
}

export function buildSalesforceUpsertOptions(
	authResponse: SalesforceAuthResponse,
	paymentDisputeBody: Omit<PaymentDisputeRecord, 'Dispute_ID__c'>,
) {
	return {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${authResponse.access_token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(paymentDisputeBody),
	};
}
