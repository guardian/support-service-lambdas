import {
	buildSalesforceUpsertOptions,
	buildSalesforceUpsertUrl,
} from '../helpers';
import type { PaymentDisputeRecord } from '../interfaces';
import type {
	SalesforceAuthResponse,
	SalesforceUpsertResponse,
} from '../types';
import { SalesforceCreateResponseSchema } from '../zod-schemas';

/**
 * Upserts a Payment Dispute record in Salesforce using Dispute_ID__c as external ID
 * Follows the pattern from @modules/salesforce/src/updateRecords.ts
 */
export async function upsertPaymentDisputeInSalesforce(
	authResponse: SalesforceAuthResponse,
	paymentDispute: PaymentDisputeRecord,
): Promise<SalesforceUpsertResponse> {
	console.log('upserting Payment Dispute record in Salesforce...');

	try {
		// Use PATCH with external ID for upsert: /sobjects/SObjectType/FieldName/FieldValue
		const url = buildSalesforceUpsertUrl(authResponse, paymentDispute);

		// Remove Dispute_ID__c from the body since it's in the URL
		const { Dispute_ID__c, ...paymentDisputeBody } = paymentDispute;

		const options = buildSalesforceUpsertOptions(
			authResponse,
			paymentDisputeBody,
		);

		const response = await fetch(url, options);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Error upserting Payment Dispute in Salesforce: ${response.statusText} - ${errorText}`,
			);
		}

		const sfCreateResponse =
			(await response.json()) as SalesforceUpsertResponse;
		const parseResponse =
			SalesforceCreateResponseSchema.safeParse(sfCreateResponse);

		if (!parseResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		console.log('successfully upserted Payment Dispute record in Salesforce');
		return parseResponse.data;
	} catch (error) {
		const errorTextBase = 'Error upserting Payment Dispute in Salesforce';
		const errorText =
			error instanceof Error
				? `${errorTextBase}: ${error.message}`
				: errorTextBase;

		throw new Error(errorText);
	}
}
