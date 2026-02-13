import {getSecretValue} from "@modules/secrets-manager/getSecret";
import type { Authorisation, BearerTokenProvider } from '@modules/zuora/auth';
import type { SfConnectedAppAuth} from '@modules/salesforce/auth/auth';
import {authenticateSalesforce} from '@modules/salesforce/auth/auth';
import type {ConnectedAppSecret} from "@modules/salesforce/secrets";

export type SfClientCredentials = {
	authUrl: string;
	sfConnectedAppAuth: SfConnectedAppAuth;
};

export class SfClientCredentialsTokenProvider implements BearerTokenProvider {
	constructor(private readonly credentials: SfClientCredentials) {}

	async getAuthorisation(): Promise<Authorisation> {
		const body = new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: this.credentials.sfConnectedAppAuth.clientId,
			client_secret: this.credentials.sfConnectedAppAuth.clientSecret,
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

export async function getSfClientCredentials(
    secretName: string,
): Promise<SfClientCredentials> {
    const { authUrl, clientId, clientSecret } =
        await getSecretValue<ConnectedAppSecret>(
            secretName,
        );

    return {
        authUrl,
        sfConnectedAppAuth: { clientId, clientSecret },
    };
}
