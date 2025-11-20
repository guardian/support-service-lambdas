import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { Failure, sequenceTry, Success, Try } from '@modules/try';
import type { ZodTypeDef } from 'zod';
import { z } from 'zod';
import type { RestClient } from '@modules/zuora/restClient';
import { RestClientError, RestClientImpl } from '@modules/zuora/restClient';
import { BearerTokenProvider } from './auth/bearerTokenProvider';
import { getOAuthClientCredentials } from './auth/oAuthCredentials';
import { generateZuoraError } from './errors/zuoraErrorHandler';
import { zuoraErrorSchema, zuoraSuccessSchema } from './types/httpResponse';
import { zuoraServerUrl } from './utils';

// *** zuora client is a bit special - example of what a more normal one would look like
export declare const Stripe: unique symbol;
export type StripeClient = RestClient<typeof Stripe>;

export const StripeClient = {
	create(): StripeClient {
		const getAuthHeaders = () => Promise.resolve({});
		return new RestClientImpl(
			'https://theguardian.com',
			getAuthHeaders,
			Stripe,
		);
	},
};
// *** end example

export declare const Zuora: unique symbol;
export type ZuoraClient = RestClient<typeof Zuora>;

export function createZuoraClientWithHeaders(
	baseUrl: string,
	getAuthHeaders: () => Promise<{ Authorization: string }>,
): ZuoraClient {
	const baseRestClient: RestClient<void> = new RestClientImpl(
		baseUrl,
		getAuthHeaders,
		undefined,
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

		__brand: Zuora,
	};
}

export const ZuoraClient = {
	async create(stage: Stage): Promise<ZuoraClient> {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
		const baseUrl = zuoraServerUrl(stage).replace(/\/$/, '');
		const getAuthHeaders = () =>
			bearerTokenProvider.getBearerToken().then((bearerToken) => ({
				Authorization: `Bearer ${bearerToken.access_token}`,
			}));
		return createZuoraClientWithHeaders(baseUrl, getAuthHeaders);
	},
};

function wrapSchemaWithSuccessCheck<
	I,
	O,
	T extends z.ZodType<O, ZodTypeDef, I>,
>(schema: T): z.ZodType<O, ZodTypeDef, O> {
	return z.custom<O>((input: unknown) => {
		if (Try(() => isLogicalSuccess(input)).getOrElse(false)) {
			return schema.parse(input);
		} else {
			throw generateZuoraError(input);
		}
	});
}

function handleZuoraFailure(e: Error | RestClientError) {
	return (
		e instanceof RestClientError ? Success(e) : Failure<RestClientError>(e)
	)
		.flatMap((e) => {
			// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
			if (e.statusCode === 429) {
				logger.log(
					`Received a 429 rate limit response with response headers ${JSON.stringify(e.responseHeaders)}`,
				);
			}
			return Success(e);
		})
		.flatMap((e) => Try((): unknown => JSON.parse(e.responseBody)))
		.flatMap((json) => Success(generateZuoraError(json)))
		.getOrElse(e);
}

async function wrap<I, O, T extends z.ZodType<O, ZodTypeDef, I>>(
	getRestResponse: (t: z.ZodType<O, z.ZodTypeDef, O>) => Promise<O>,
	schema: T,
) {
	const schemaWithSuccessCheck = wrapSchemaWithSuccessCheck<I, O, T>(schema);
	const failableResponse = await sequenceTry(
		getRestResponse(schemaWithSuccessCheck),
	);
	return failableResponse.mapError(handleZuoraFailure).get();
}

const isLogicalSuccess = (json: unknown): boolean => {
	const matchesSuccessfulResponse = zuoraSuccessSchema.safeParse(json).success;
	const matchesKnownErrorResponse = zuoraErrorSchema.safeParse(json).success;
	return matchesSuccessfulResponse || !matchesKnownErrorResponse;
};
