import { z } from 'zod';
import type { SfAuthResponse } from './auth';
import { sfApiVersion } from './config';

export async function executeSalesforceQuery(
	sfAuthResponse: SfAuthResponse,
	query: string,
): Promise<SalesforceQueryResponse> {
	try {
		const response = await fetch(
			`${sfAuthResponse.instance_url}/services/data/${sfApiVersion()}/query?q=${encodeURIComponent(query)}`,
			{
				method: 'GET',
				headers: {
					Authorization: `Bearer ${sfAuthResponse.access_token}`,
					'Content-Type': 'application/json',
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to execute query: ${response.statusText}`);
		}

		const sfQueryResponse = (await response.json()) as SalesforceQueryResponse;

		const parseResponse =
			SalesforceQueryResponseSchema.safeParse(sfQueryResponse);

		if (!parseResponse.success) {
			throw new Error(
				`Error parsing response from Salesforce: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		return parseResponse.data;
	} catch (error) {
		const errorText = `Error querying Salesforce: ${JSON.stringify(error)}`;
		throw new Error(errorText);
	}
}

//todo hoist this up to a higher level
export const SalesforceAttributesSchema = z.object({
	type: z.string(),
	url: z.string().optional(),
});

export const BillingAccountRecordSchema = z.object({
	attributes: SalesforceAttributesSchema,
	Id: z.string(),
	GDPR_Removal_Attempts__c: z.number(),
	Zuora__External_Id__c: z.string(),
});

export const BillingAccountRecordsSchema = z.array(BillingAccountRecordSchema);
export type BillingAccountRecord = z.infer<typeof BillingAccountRecordSchema>;

export const BillingAccountRecordWithSuccessSchema =
	BillingAccountRecordSchema.extend({
		crmIdRemovedSuccessfully: z.boolean(),
	});
export type BillingAccountRecordWithSuccess = z.infer<
	typeof BillingAccountRecordWithSuccessSchema
>;

const SalesforceQueryResponseSchema = z.object({
	totalSize: z.number(),
	done: z.boolean(),
	records: z.array(BillingAccountRecordSchema),
});
export type SalesforceQueryResponse = z.infer<
	typeof SalesforceQueryResponseSchema
>;