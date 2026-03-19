import { getSecretValue } from '@modules/secrets-manager/getSecret';
import type { Stage } from '@modules/stage';
import { z } from 'zod';
import type { Authorisation, BearerTokenProvider } from './auth';
import { RestClient } from './restClient';

const goCardlessBaseUrl = (stage: Stage): string =>
	stage === 'PROD'
		? 'https://api.gocardless.com'
		: 'https://api-sandbox.gocardless.com';

// The secret is stored as a single-key object where the key is the secret path
// and the value is the token string.
const goCardlessSecretSchema = z
	.record(z.string())
	.transform((obj) => ({ token: Object.values(obj)[0] ?? '' }))
	.pipe(z.object({ token: z.string().min(1) }));

class GoCardlessTokenProvider implements BearerTokenProvider {
	constructor(
		private readonly baseUrl: string,
		private readonly token: string,
	) {}

	getAuthorisation(): Promise<Authorisation> {
		return Promise.resolve({
			baseUrl: this.baseUrl,
			authHeaders: {
				Authorization: `Bearer ${this.token}`,
				'GoCardless-Version': '2015-07-06',
			},
		});
	}
}

export class GoCardlessClient extends RestClient {
	static async create(stage: Stage): Promise<GoCardlessClient> {
		const secret = await getSecretValue<unknown>(
			`${stage}/GoCardless/SupportServiceLambdasZuoraModule`,
		);
		const { token } = goCardlessSecretSchema.parse(secret);
		return new GoCardlessClient(
			new GoCardlessTokenProvider(goCardlessBaseUrl(stage), token),
		);
	}
}
