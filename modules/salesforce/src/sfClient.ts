import type {BearerTokenProvider} from '@modules/zuora/auth';
import { RestClient } from '@modules/zuora/restClient';
import {
	getSfClientCredentials,
	SfClientCredentialsTokenProvider
} from "@modules/salesforce/auth/sfClientCredentialsTokenProvider";
import {getSfPasswordFlowCredentials, SfPasswordFlowTokenProvider} from '@modules/salesforce/auth/sfPasswordFlowTokenProvider';
import type { SecretNames } from '@modules/salesforce/secrets';

export class SfClient extends RestClient {
	constructor(tokenProvider: BearerTokenProvider) {
		super(tokenProvider);
	}
	
	static async createWithPasswordFlow(secretNames: SecretNames) {
		const credentials = await getSfPasswordFlowCredentials(secretNames);
		const tokenProvider = new SfPasswordFlowTokenProvider(credentials);
		return new SfClient(tokenProvider);
	}

	static async createWithClientCredentials(
		secretName: string,
	): Promise<SfClient> {
		const credentials = await getSfClientCredentials(secretName);
		const tokenProvider = new SfClientCredentialsTokenProvider(credentials);
		return new SfClient(tokenProvider);
	}
}
