import { RestClient } from '@modules/zuora/restClient';
import { SfBearerTokenProvider } from '@modules/salesforce/auth/sfBearerTokenProvider';
import { getSfOauthCredentials } from '@modules/salesforce/auth/sfOAuthCredentials';
import type { SecretNames } from '@modules/salesforce/secrets';

export class SfClient extends RestClient {
	static async create(secretNames: SecretNames) {
		const credentials = await getSfOauthCredentials(secretNames);
		const tokenProvider = new SfBearerTokenProvider(credentials);
		return new SfClient(tokenProvider);
	}
}
