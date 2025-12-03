import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { z } from 'zod';
import { RestClient, RestClientError } from '@modules/zuora/restClient';
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

	constructor(stage: Stage, tokenProvider?: BearerTokenProvider) {
		super(zuoraServerUrl(stage), tokenProvider);
	}

	public async get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		try {
			return await super.get(path, withSuccessCheck(schema));
		} catch (e) {
			throw handleZuoraFailure(e);
		}
	}

	public async post<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		try {
			return await super.post(path, body, withSuccessCheck(schema), headers);
		} catch (e) {
			throw handleZuoraFailure(e);
		}
	}

	public async put<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		try {
			return await super.put(path, body, withSuccessCheck(schema), headers);
		} catch (e) {
			throw handleZuoraFailure(e);
		}
	}

	public async delete<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		try {
			return await super.delete(path, withSuccessCheck(schema));
		} catch (e) {
			throw handleZuoraFailure(e);
		}
	}
}

/**
 * since zuora returns a wide variety of unsuccessful responses inside of 200 statuses, we need to check for
 * failure and skip parsing if we detect one.  Then handleZuoraFailure will throw a suitable detailed exception.
 * @param successSchema the schema that can parse a successful response
 */
function withSuccessCheck<T extends z.ZodType<O, z.ZodTypeDef, I>, O, I>(
	successSchema: T,
) {
	return z.any().refine(isLogicalSuccess).pipe(successSchema);
}

function handleZuoraFailure(e: unknown) {
	if (e instanceof RestClientError) {
		// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
		if (e.status === 429) {
			logger.log(
				`Received a 429 rate limit response with response headers ${JSON.stringify(e.responseHeaders)}`,
			);
		}
		return generateZuoraError(JSON.parse(e.responseBody), e);
	}
	return new Error('value thrown that was not an Error', { cause: e });
}

const isLogicalSuccess = (json: unknown): boolean => {
	const matchesSuccessfulResponse = zuoraSuccessSchema.safeParse(json).success;
	const matchesKnownErrorResponse = zuoraErrorSchema.safeParse(json).success;
	return matchesSuccessfulResponse || !matchesKnownErrorResponse;
};
