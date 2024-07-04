import { stageFromEnvironment } from '@modules/stage';
import { doSfAuth, updateSfBillingAccounts } from './salesforceHttp';
import type { SfApiUserAuth, SfConnectedAppAuth } from './salesforceHttp';
import { getSalesforceSecretNames, getSecretValue } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export async function handler() {
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

	const sfUpdateResponse = await updateSfBillingAccounts(sfAuthResponse);

	return sfUpdateResponse;
}
