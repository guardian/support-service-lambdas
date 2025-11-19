import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { RestResult } from '@modules/zuora/restClient';
import { RestClient } from '@modules/zuora/restClient';
import { BearerTokenProvider } from './auth/bearerTokenProvider';
import { getOAuthClientCredentials } from './auth/oAuthCredentials';
import { generateZuoraError } from './errors/zuoraErrorHandler';
import { zuoraErrorSchema, zuoraSuccessSchema } from './types/httpResponse';
import { zuoraServerUrl } from './utils';

export class ZuoraClient extends RestClient {
	static async create(stage: Stage) {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
		return new ZuoraClient(stage, bearerTokenProvider);
	}
	constructor(
		stage: Stage,
		private tokenProvider: BearerTokenProvider,
	) {
		super(zuoraServerUrl(stage).replace(/\/$/, '')); // remove trailing slash
	}

	protected generateError = (result: RestResult) => {
		// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
		if (result.response.status === 429) {
			logger.log(
				`Received a 429 rate limit response with response headers ${JSON.stringify(result.responseHeaders)}`,
			);
		}
		return generateZuoraError(JSON.parse(result.responseBody), result.response);
	};

	protected isLogicalSuccess = (json: unknown) => {
		try {
			return isLogicalSuccess(json);
		} catch {
			return false;
		}
	};

	protected getAuthHeaders = async () => {
		const bearerToken = await this.tokenProvider.getBearerToken();

		return { Authorization: `Bearer ${bearerToken.access_token}` };
	};
}

const isLogicalSuccess = (json: unknown): boolean => {
	const matchesSuccessfulResponse = zuoraSuccessSchema.safeParse(json).success;
	const matchesKnownErrorResponse = zuoraErrorSchema.safeParse(json).success;
	return matchesSuccessfulResponse || !matchesKnownErrorResponse;
};
