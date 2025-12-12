import { getSecretValue } from '@modules/secrets-manager/getSecret';
import type { Stage } from '@modules/stage';
import type { SfConnectedAppAuth } from '@modules/salesforce/auth/auth';
import {
	type ApiUserSecret,
	type ConnectedAppSecret,
	getSalesforceSecretNames,
} from '@modules/salesforce/secrets';

export async function getSfOauthCredentials(
	stage: Stage,
): Promise<SfCredentials> {
	const secretNames = getSalesforceSecretNames(stage);

	const { authUrl, clientId, clientSecret } =
		await getSecretValue<ConnectedAppSecret>(
			secretNames.connectedAppSecretName,
		);

	const { username, password, token } = await getSecretValue<ApiUserSecret>(
		secretNames.apiUserSecretName,
	);

	const sfConnectedAppAuth: SfConnectedAppAuth = { clientId, clientSecret };
	return { authUrl, username, password, token, sfConnectedAppAuth };
}

export type SfCredentials = {
	authUrl: string;
	username: string;
	password: string;
	token: string;
	sfConnectedAppAuth: SfConnectedAppAuth;
};
