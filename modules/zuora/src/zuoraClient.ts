import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
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
	);

	return {
		get(path, schema, callerInfo = logger.getCallerInfo(1)) {
			return wrap((s) => baseRestClient.get(path, s, callerInfo), schema);
		},
		post(path, body, schema, headers, callerInfo = logger.getCallerInfo(1)) {
			return wrap(
				(s) => baseRestClient.post(path, body, s, headers, callerInfo),
				schema,
			);
		},
		put(path, body, schema, headers, callerInfo = logger.getCallerInfo(1)) {
			return wrap(
				(s) => baseRestClient.put(path, body, s, headers, callerInfo),
				schema,
			);
		},
		delete(path, schema, callerInfo = logger.getCallerInfo(1)) {
			return wrap((s) => baseRestClient.delete(path, s, callerInfo), schema);
		},
		getRaw() {
			return Promise.reject(
				new Error('getRaw is not yet supported for zuora client'),
			);
		},
		clientName: 'ZuoraClient',
	};
}

function handleZuoraFailure(e: unknown) {
	if (e instanceof RestClientError) {
		// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
		if (e.statusCode === 429) {
			logger.log(
				`Received a 429 rate limit response with response headers ${JSON.stringify(e.responseHeaders)}`,
			);
		}
		return generateZuoraError(JSON.parse(e.responseBody), e);
	}
	return new Error('value thrown that was not an Error', { cause: e });
}

async function wrap<I, O, T extends z.ZodType<O, ZodTypeDef, I>>(
	getRestResponse: (t: z.ZodType<O, z.ZodTypeDef, I>) => Promise<O>,
	schema: T,
) {
	const schemaWithSuccessCheck = z.any().refine(isLogicalSuccess).pipe(schema);
	try {
		return await getRestResponse(schemaWithSuccessCheck);
	} catch (e) {
		throw handleZuoraFailure(e);
	}
}

const isLogicalSuccess = (json: unknown): boolean => {
	const matchesSuccessfulResponse = zuoraSuccessSchema.safeParse(json).success;
	const matchesKnownErrorResponse = zuoraErrorSchema.safeParse(json).success;
	return matchesSuccessfulResponse || !matchesKnownErrorResponse;
};
