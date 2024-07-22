import type { SfAuthResponse } from '@modules/salesforce/src/auth';
import { sfApiVersion } from '@modules/salesforce/src/config';
import { SalesforceAttributesSchema } from '@modules/salesforce/src/query';
import type { SalesforceUpdateResponse } from '@modules/salesforce/src/updateRecords';
import { doCompositeCallout } from '@modules/salesforce/src/updateRecords';
import { z } from 'zod';

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

export async function updateSfBillingAccounts(
	sfAuthResponse: SfAuthResponse,
	records: BillingAccountRecord[],
): Promise<SalesforceUpdateResponse[]> {
	try {
		const url = `${sfAuthResponse.instance_url}/services/data/${sfApiVersion()}/composite/sobjects`;

		const body = JSON.stringify({
			allOrNone: false,
			records,
		});
		const sfUpdateResponse = await doCompositeCallout(
			url,
			sfAuthResponse.access_token,
			body,
		);
		return sfUpdateResponse;
	} catch (error) {
		const errorText = `Error updating billing accounts in Salesforce: ${JSON.stringify(error)}`;
		throw new Error(errorText);
	}
}