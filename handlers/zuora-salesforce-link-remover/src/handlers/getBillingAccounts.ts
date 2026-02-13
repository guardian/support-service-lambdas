import { executeSalesforceQuery } from '@modules/salesforce/query';
import { RecordSchema } from '@modules/salesforce/recordSchema';
import { SfClient } from '@modules/salesforce/sfClient';
import { stageFromEnvironment } from '@modules/stage';
import { z } from 'zod';
import { getSalesforceSecretNames } from '../salesforceSecretNames';

export async function handler() {
	try {
		const stage = stageFromEnvironment();
		const sfClient = await SfClient.create(getSalesforceSecretNames(stage));

		const limit = 200;
		const query = `SELECT Id, Zuora__Account__c, GDPR_Removal_Attempts__c, Zuora__External_Id__c FROM Zuora__CustomerAccount__c WHERE Zuora__External_Id__c != null AND Zuora__Account__r.GDPR_Billing_Accounts_Ready_for_Removal__c = true AND GDPR_Removal_Attempts__c < 5 ORDER BY Zuora__Account__r.GDPR_Date_Successfully_Removed_Related__c desc LIMIT ${limit}`;

		const response = await executeSalesforceQuery(
			sfClient,
			query,
			BillingAccountRecordSchema,
		);

		return {
			billingAccountsToProcess: response.records,
		};
	} catch (error) {
		throw new Error(
			`Error fetching billing accounts from Salesforce: ${JSON.stringify(error)}`,
		);
	}
}

export const BillingAccountRecordSchema = RecordSchema.extend({
	GDPR_Removal_Attempts__c: z.number(),
	Zuora__External_Id__c: z.string(),
});
export type BillingAccountRecord = z.infer<typeof BillingAccountRecordSchema>;

export const BillingAccountRecordWithSuccessSchema =
	BillingAccountRecordSchema.extend({
		crmIdRemovedSuccessfully: z.boolean(),
	});
export type BillingAccountRecordWithSuccess = z.infer<
	typeof BillingAccountRecordWithSuccessSchema
>;
