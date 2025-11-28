import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { Failure, Success, TryFromPromise } from '@modules/try';
import type { ZodTypeDef } from 'zod';
import { z } from 'zod';
import type { RestClient } from '@modules/zuora/restClient';
import { RestClientError, RestClientImpl } from '@modules/zuora/restClient';
import { BearerTokenProvider } from './auth/bearerTokenProvider';
import { getOAuthClientCredentials } from './auth/oAuthCredentials';
import { generateZuoraError } from './errors/zuoraErrorHandler';
import { zuoraErrorSchema, zuoraSuccessSchema } from './types/httpResponse';
import { zuoraServerUrl } from './utils';

export type ZuoraClient = RestClient<'ZuoraClient'>;

export const ZuoraClient = {
	async create(stage: Stage): Promise<ZuoraClient> {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
		const getAuthHeaders = () =>
			bearerTokenProvider.getBearerToken().then((bearerToken) => ({
				Authorization: `Bearer ${bearerToken.access_token}`,
			}));
		return createZuoraClientWithHeaders(stage, getAuthHeaders);
	},
};

export function createZuoraClientWithHeaders(
	stage: Stage,
	getAuthHeaders: () => Promise<{ Authorization: string }>,
): ZuoraClient {
	const baseRestClient = new RestClientImpl(
		zuoraServerUrl(stage).replace(/\/$/, ''),
		getAuthHeaders,
		'underlyingZuoraClient',
		2, // align logging to the line that calls zuoraClient.get/post
	);

	return {
		get(path, schema) {
			return wrap((s) => baseRestClient.get(path, s), schema);
		},
		post(path, body, schema, headers) {
			return wrap((s) => baseRestClient.post(path, body, s, headers), schema);
		},
		put(path, body, schema, headers) {
			return wrap((s) => baseRestClient.put(path, body, s, headers), schema);
		},
		delete(path, schema) {
			return wrap((s) => baseRestClient.delete(path, s), schema);
		},
		getRaw() {
			return Promise.reject(
				new Error('getRaw is not yet supported for zuora client'),
			);
		},
		__brand: 'ZuoraClient',
	};
}

function handleZuoraFailure(e: Error | RestClientError) {
	const maybeRestClientError =
		e instanceof RestClientError ? Success(e) : Failure<RestClientError>(e);
	maybeRestClientError.forEach((e) => {
		// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
		if (e.statusCode === 429) {
			logger.log(
				`Received a 429 rate limit response with response headers ${JSON.stringify(e.responseHeaders)}`,
			);
		}
	});
	return maybeRestClientError
		.map((e) => generateZuoraError(JSON.parse(e.responseBody), e))
		.getOrElse(e);
}

async function wrap<I, O, T extends z.ZodType<O, ZodTypeDef, I>>(
	getRestResponse: (t: z.ZodType<O, z.ZodTypeDef, I>) => Promise<O>,
	schema: T,
) {
	const schemaWithSuccessCheck = z.any().refine(isLogicalSuccess).pipe(schema);
	const failableResponse = await TryFromPromise(
		getRestResponse(schemaWithSuccessCheck),
	);
	return failableResponse.mapError(handleZuoraFailure).get();
}

const isLogicalSuccess = (json: unknown): boolean => {
	const matchesSuccessfulResponse = zuoraSuccessSchema.safeParse(json).success;
	const matchesKnownErrorResponse = zuoraErrorSchema.safeParse(json).success;
	return matchesSuccessfulResponse || !matchesKnownErrorResponse;
};
