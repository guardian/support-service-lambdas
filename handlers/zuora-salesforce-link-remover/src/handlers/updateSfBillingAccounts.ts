import { sfApiVersion } from '@modules/salesforce/config';
import { SfClient } from '@modules/salesforce/sfClient';
import type {
	SalesforceUpdateResponse,
	SalesforceUpdateResponseArray,
} from '@modules/salesforce/updateRecords';
import { doCompositeCallout } from '@modules/salesforce/updateRecords';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { getSalesforceSecretNames } from '../salesforceSecretNames';
import type { BillingAccountRecord } from './getBillingAccounts';
import { BillingAccountRecordSchema } from './getBillingAccounts';

export const handler: Handler<
	BillingAccountRecord[],
	SalesforceUpdateResponseArray
> = async (billingAccounts) => {
	try {
		const parseResponse = z
			.array(BillingAccountRecordSchema)
			.safeParse(billingAccounts);

		if (!parseResponse.success) {
			throw new Error(
				`Error parsing data from input: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}
		const billingAccountsToUpdate: BillingAccountRecord[] = parseResponse.data;

		const stage = stageFromEnvironment();
		const sfClient = await SfClient.createWithPasswordFlow(
			getSalesforceSecretNames(stage),
		);

		const sfUpdateResponse = await updateSfBillingAccounts(
			sfClient,
			billingAccountsToUpdate,
		);

		return sfUpdateResponse;
	} catch (error) {
		throw new Error(
			`Error updating billing account in Salesforce: ${JSON.stringify(error)}`,
		);
	}
};

export async function updateSfBillingAccounts(
	sfClient: SfClient,
	records: BillingAccountRecord[],
): Promise<SalesforceUpdateResponse[]> {
	try {
		const sfUpdateResponse = await doCompositeCallout(
			sfClient,
			`/services/data/${sfApiVersion()}/composite/sobjects`,
			{
				allOrNone: false,
				records,
			},
		);
		return sfUpdateResponse;
	} catch (error) {
		const errorText = `Error updating billing accounts in Salesforce: ${JSON.stringify(error)}`;
		throw new Error(errorText);
	}
}
