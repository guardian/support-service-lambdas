import { doSfAuth, updateSfBillingAccounts } from './salesforceHttp';
import type { SfApiUserAuth, SfConnectedAppAuth } from './salesforceHttp';
import { getSalesforceSecretNames, getSecretValue } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export async function handler() {
	const stage = process.env.STAGE;

	if (!stage) {
		throw Error('Stage not defined');
	}

	if (!isValidStage(stage)) {
		throw Error('Invalid stage value');
	}

	const secretNames = getSalesforceSecretNames(stage);

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

	const sfUpdateResponse = await updateSfBillingAccounts(sfAuthResponse);

	return sfUpdateResponse;
}

function isValidStage(value: unknown): value is 'CODE' | 'PROD' {
	return value === 'CODE' || value === 'PROD';
}
