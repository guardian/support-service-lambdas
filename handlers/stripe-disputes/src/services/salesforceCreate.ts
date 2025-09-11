import type { Logger } from '@modules/logger';
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
 *
 * This function performs an HTTP PATCH request to Salesforce to create or update
 * a Payment Dispute record. It uses the Dispute_ID__c field as an external ID
 * for upsert operations, following Salesforce best practices.
 *
 * @param authResponse - Salesforce authentication response containing access token and instance URL
 * @param paymentDispute - Payment dispute record data to upsert
 * @param logger - Logger instance for tracking the operation
 * @returns Promise containing the Salesforce upsert response with record ID and success status
 * @throws {Error} When the HTTP request fails or response validation fails
 */
export async function upsertPaymentDisputeInSalesforce(
	authResponse: SalesforceAuthResponse,
	paymentDispute: PaymentDisputeRecord,
	logger: Logger,
): Promise<SalesforceUpsertResponse> {
	logger.log('upserting Payment Dispute record in Salesforce...');

	try {
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

		logger.log('successfully upserted Payment Dispute record in Salesforce');
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
