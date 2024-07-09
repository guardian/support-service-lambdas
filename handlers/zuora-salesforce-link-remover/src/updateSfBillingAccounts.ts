import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import { BillingAccountRecordsSchema, doSfAuth, updateSfBillingAccounts } from './salesforceHttp';
import type {
	BillingAccountRecord,
	SalesforceUpdateResponseArray,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from './salesforceHttp';
import { getSalesforceSecretNames, getSecretValue } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export const handler: Handler<BillingAccountRecord[], SalesforceUpdateResponseArray> = async (billingAccounts) => {

	const parseResponse = BillingAccountRecordsSchema.safeParse(billingAccounts);

	if (!parseResponse.success) {
		throw new Error(
			`Error parsing data from input: ${JSON.stringify(parseResponse.error.format())}`,
		);
	}
	const billingAccountsToUpdate: BillingAccountRecord[] = parseResponse.data;
	console.log('billingAccountsToUpdate:',billingAccountsToUpdate);
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
}