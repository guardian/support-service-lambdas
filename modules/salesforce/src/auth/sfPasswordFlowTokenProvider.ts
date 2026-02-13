import {getSecretValue} from "@modules/secrets-manager/getSecret";
import type {Authorisation, BearerTokenProvider} from '@modules/zuora/auth';
import type {
	SfConnectedAppAuth} from '@modules/salesforce/auth/auth';
import {
	authenticateSalesforce
} from '@modules/salesforce/auth/auth';
import type {ApiUserSecret, ConnectedAppSecret, SecretNames} from "@modules/salesforce/secrets";

export type SfPasswordCredentials = {
	authUrl: string;
	username: string;
	password: string;
	token: string;
	sfConnectedAppAuth: SfConnectedAppAuth;
};

export class SfPasswordFlowTokenProvider implements BearerTokenProvider {
	constructor(private readonly credentials: SfPasswordCredentials) {}

	async getAuthorisation(): Promise<Authorisation> {
		const body = new URLSearchParams({
			grant_type: 'password',
			client_id: this.credentials.sfConnectedAppAuth.clientId,
			client_secret: this.credentials.sfConnectedAppAuth.clientSecret,
			username: this.credentials.username,
			password: `${this.credentials.password}${this.credentials.token}`,
		});

		const authResponse = await authenticateSalesforce(
			this.credentials.authUrl,
			body,
		);

		return {
			baseUrl: authResponse.instance_url,
			authHeaders: {
				Authorization: `Bearer ${authResponse.access_token}`,
			},
		};
	}
}

export async function getSfPasswordFlowCredentials(
	secretNames: SecretNames,
): Promise<SfPasswordCredentials> {
	const {authUrl, clientId, clientSecret} =
		await getSecretValue<ConnectedAppSecret>(
			secretNames.connectedAppSecretName,
		);

	const {username, password, token} = await getSecretValue<ApiUserSecret>(
		secretNames.apiUserSecretName,
	);

	const sfConnectedAppAuth: SfConnectedAppAuth = {clientId, clientSecret};
	return {authUrl, username, password, token, sfConnectedAppAuth};
}