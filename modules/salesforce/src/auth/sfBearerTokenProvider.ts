import type { Authorisation, BearerTokenProvider } from '@modules/zuora/auth';
import type {
	SfApiUserAuth,
	SfAuthResponse,
} from '@modules/salesforce/auth/auth';
import { doSfAuth } from '@modules/salesforce/auth/auth';
import type { SfCredentials } from '@modules/salesforce/auth/sfOAuthCredentials';

export class SfBearerTokenProvider implements BearerTokenProvider {
	constructor(private readonly credentials: SfCredentials) {}

	async getAuthorisation(): Promise<Authorisation> {
		const sfApiUserAuth: SfApiUserAuth = {
			url: this.credentials.authUrl,
			grant_type: 'password',
			username: this.credentials.username,
			password: this.credentials.password,
			token: this.credentials.token,
		};

		const sfAuthResponse: SfAuthResponse = await doSfAuth(
			sfApiUserAuth,
			this.credentials.sfConnectedAppAuth,
		);

		return {
			baseUrl: sfAuthResponse.instance_url,
			authHeaders: {
				Authorization: `Bearer ${sfAuthResponse.access_token}`,
			},
		};
	}
}
