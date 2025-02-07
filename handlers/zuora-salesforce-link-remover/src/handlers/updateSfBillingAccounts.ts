import type {
	SfApiUserAuth,
	SfAuthResponse,
	SfConnectedAppAuth,
} from '@modules/salesforce/src/auth';
import { doSfAuth } from '@modules/salesforce/src/auth';
import { sfApiVersion } from '@modules/salesforce/src/config';
import type {
	SalesforceUpdateResponse,
	SalesforceUpdateResponseArray,
} from '@modules/salesforce/src/updateRecords';
import { doCompositeCallout } from '@modules/salesforce/src/updateRecords';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { getSalesforceSecretNames } from '../secrets';
import type { ApiUserSecret, ConnectedAppSecret } from '../secrets';
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

		const secretNames = getSalesforceSecretNames(stageFromEnvironment());

		const { authUrl, clientId, clientSecret } =
			await getSecretValue<ConnectedAppSecret>(
				secretNames.connectedAppSecretName,
			);

		const { username, password, token } = await getSecretValue<ApiUserSecret>(
			secretNames.apiUserSecretName,
		);

		const sfConnectedAppAuth: SfConnectedAppAuth = { clientId, clientSecret };
		const sfApiUserAuth: SfApiUserAuth = {
			url: authUrl,
			grant_type: 'password',
			username,
			password,
			token,
		};

		const sfAuthResponse = await doSfAuth(sfApiUserAuth, sfConnectedAppAuth);

		const sfUpdateResponse = await updateSfBillingAccounts(
			sfAuthResponse,
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
