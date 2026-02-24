import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { ZodTypeDef } from 'zod';
import { z } from 'zod';
import { RestClient, RestClientError } from '@modules/zuora/restClient';
import { ZuoraBearerTokenProvider } from './auth/bearerTokenProvider';
import { getOAuthClientCredentials } from './auth/oAuthCredentials';
import { generateZuoraError } from './errors/zuoraErrorHandler';
import { zuoraErrorSchema, zuoraSuccessSchema } from './types/httpResponse';

export class ZuoraClient extends RestClient {
	static async create(stage: Stage) {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new ZuoraBearerTokenProvider(
			stage,
			credentials,
		);
		return new ZuoraClient(bearerTokenProvider);
	}

	/*
	 * a normal RestClient throws non-2xx responses as Errors.  For Zuora, there are an extra layer of errors that
	 * come back as 200 responses, and thus need their own special errors thrown.
	 */
	override async fetch<I, O, T extends z.ZodType<O, ZodTypeDef, I>>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		try {
			/*
			 * since zuora returns a wide variety of unsuccessful responses inside of 200 statuses, we need to check for
			 * failure and fail parsing if we detect one.  Then handleZuoraFailure will throw a suitable detailed exception.
			 */
			const successSchema = z.any().refine(isLogicalSuccess).pipe(schema);
			return await super.fetch(path, method, successSchema, body, headers);
		} catch (e) {
			if (e instanceof RestClientError) {
				// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
				if (e.status === 429) {
					logger.log(
						`Received a 429 rate limit response with response headers ${JSON.stringify(e.responseHeaders)}`,
					);
				}
				let parsedBody: unknown;
				try {
					parsedBody = JSON.parse(e.responseBody);
				} catch {
					// we're not going to be able to extract anything useful from non-json
					throw e;
				}
				const customError = generateZuoraError(parsedBody, e);
				if (customError !== undefined) {
					throw customError;
				}
			}
			throw new Error('unexpected error thrown during REST call', { cause: e });
		}
	}
}

const isLogicalSuccess = (json: unknown): boolean => {
	const matchesSuccessfulResponse = zuoraSuccessSchema.safeParse(json).success;
	const matchesKnownErrorResponse = zuoraErrorSchema.safeParse(json).success;
	return matchesSuccessfulResponse || !matchesKnownErrorResponse;
};
