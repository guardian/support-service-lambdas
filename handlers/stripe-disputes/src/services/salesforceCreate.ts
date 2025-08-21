import type { SfAuthResponse } from '@modules/salesforce/src/auth';
import { sfApiVersion } from '@modules/salesforce/src/config';
import { z } from 'zod';
import type { PaymentDisputeRecord } from './stripeToSalesforceMapper';

const SalesforceCreateErrorSchema = z.object({
	statusCode: z.string().optional(),
	message: z.string(),
	fields: z.array(z.string()),
});

const SalesforceCreateResponseSchema = z.object({
	id: z.string().optional(),
	success: z.boolean(),
	errors: z.array(SalesforceCreateErrorSchema),
});

export type SalesforceCreateResponse = z.infer<
	typeof SalesforceCreateResponseSchema
>;

/**
 * Upserts a Payment Dispute record in Salesforce using Dispute_ID__c as external ID
 * Follows the pattern from @modules/salesforce/src/updateRecords.ts
 */
export async function upsertPaymentDisputeInSalesforce(
	authResponse: SfAuthResponse,
	paymentDispute: PaymentDisputeRecord,
): Promise<SalesforceCreateResponse> {
	console.log('upserting Payment Dispute record in Salesforce...');

	try {
		// Use PATCH with external ID for upsert: /sobjects/SObjectType/FieldName/FieldValue
		const url = `${authResponse.instance_url}/services/data/${sfApiVersion()}/sobjects/Payment_Dispute__c/Dispute_ID__c/${paymentDispute.Dispute_ID__c}`;

		// Remove Dispute_ID__c from the body since it's in the URL
		const { Dispute_ID__c, ...paymentDisputeBody } = paymentDispute;

		const options = {
			method: 'PATCH',
			headers: {
				Authorization: `Bearer ${authResponse.access_token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(paymentDisputeBody),
		};

		const response = await fetch(url, options);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Error upserting Payment Dispute in Salesforce: ${response.statusText} - ${errorText}`,
			);
		}

		const sfCreateResponse =
			(await response.json()) as SalesforceCreateResponse;
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
