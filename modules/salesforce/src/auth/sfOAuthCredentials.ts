import { getSecretValue } from '@modules/secrets-manager/getSecret';
import type { SfConnectedAppAuth } from '@modules/salesforce/auth/auth';
import type {
	SecretNames} from '@modules/salesforce/secrets';
import {
	type ApiUserSecret,
	type ConnectedAppSecret
} from '@modules/salesforce/secrets';

export async function getSfOauthCredentials(
	secretNames: SecretNames,
): Promise<SfCredentials> {
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
