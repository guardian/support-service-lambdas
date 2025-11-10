import { sfApiVersion } from '@modules/salesforce/src/config';
import type { PaymentDisputeRecord } from '../interfaces';
import type { SalesforceAuthResponse } from '../types';

export function buildSalesforceUpsertUrl(
	authResponse: SalesforceAuthResponse,
	paymentDispute: PaymentDisputeRecord,
): string {
	return `${authResponse.instance_url}/services/data/${sfApiVersion()}/sobjects/Payment_Dispute__c/Dispute_ID__c/${paymentDispute.Dispute_ID__c}`;
}

export function buildSalesforceUpsertOptions(
	authResponse: SalesforceAuthResponse,
	paymentDisputeRecord: PaymentDisputeRecord,
) {
	// Dispute_ID__c will be in the request URL, so should not be included in the request body
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Extracting Dispute_ID__c to exclude it from the request body
	const { Dispute_ID__c, ...body } = paymentDisputeRecord;

	return {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${authResponse.access_token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	};
}
