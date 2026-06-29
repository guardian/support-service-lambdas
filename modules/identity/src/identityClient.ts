import { getSSMParam } from '@modules/aws/ssm';
import type { Stage } from '@modules/stage';
import type { Authorisation, BearerTokenProvider } from '@modules/zuora/auth';
import { RestClient } from '@modules/zuora/restClient';

const identityBaseUrl: Record<Stage, string> = {
	CODE: 'https://idapi.code.dev-theguardian.com',
	PROD: 'https://idapi.theguardian.com',
};

class IdentityTokenProvider implements BearerTokenProvider {
	constructor(
		private readonly token: string,
		private readonly stage: Stage,
	) {}

	getAuthorisation(): Promise<Authorisation> {
		return Promise.resolve({
			baseUrl: identityBaseUrl[this.stage],
			authHeaders: {
				'X-GU-ID-Client-Access-Token': `Bearer ${this.token}`,
				'Content-Type': 'application/json',
			},
		});
	}
}

export class IdentityClient extends RestClient {
	static async create(
		stage: Stage,
		ssmParamName: string,
	): Promise<IdentityClient> {
		const token = await getSSMParam(ssmParamName);
		return new IdentityClient(new IdentityTokenProvider(token, stage));
	}
}
