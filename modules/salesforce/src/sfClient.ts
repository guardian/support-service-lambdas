import type { Stage } from '@modules/stage';
import { RestClient } from '@modules/zuora/restClient';
import { SfBearerTokenProvider } from '@modules/salesforce/auth/sfBearerTokenProvider';
import { getSfOauthCredentials } from '@modules/salesforce/auth/sfOAuthCredentials';

export class SfClient extends RestClient {
	static async create(stage: Stage) {
		const credentials = await getSfOauthCredentials(stage);
		const tokenProvider = new SfBearerTokenProvider(credentials);
		return new SfClient(tokenProvider);
	}
}
