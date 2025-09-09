import { sfApiVersion } from '@modules/salesforce/src/config';
import type { PaymentDisputeRecord } from '../interfaces';
import type { SalesforceAuthResponse } from '../types';

/**
 * Builds the Salesforce API URL for upserting a Payment Dispute record using external ID
 *
 * @param authResponse - Salesforce authentication response containing instance URL
 * @param paymentDispute - Payment dispute record containing the external ID
 * @returns Complete Salesforce upsert URL
 */
export function buildSalesforceUpsertUrl(
	authResponse: SalesforceAuthResponse,
	paymentDispute: PaymentDisputeRecord,
): string {
	return `${authResponse.instance_url}/services/data/${sfApiVersion()}/sobjects/Payment_Dispute__c/Dispute_ID__c/${paymentDispute.Dispute_ID__c}`;
}

/**
 * Builds HTTP request options for Salesforce upsert operation
 *
 * @param authResponse - Salesforce authentication response containing access token
 * @param paymentDisputeBody - Payment dispute data without the external ID (already in URL)
 * @returns HTTP request options including headers and body
 */
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
