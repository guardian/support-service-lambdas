import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { ZodTypeDef } from 'zod';
import { z } from 'zod';
import { BearerTokenProvider } from './auth/bearerTokenProvider';
import { getOAuthClientCredentials } from './auth/oAuthCredentials';
import { generateZuoraError } from './errors/zuoraErrorHandler';
import { zuoraErrorSchema, zuoraSuccessSchema } from './types/httpResponse';
import { zuoraServerUrl } from './utils';

export class RestClientError extends Error implements RestResult {
	static create = (message: string, result: RestResult, e?: unknown) =>
		new RestClientError(
			message,
			result.status,
			result.responseBody,
			result.responseHeaders,
			e === undefined || e instanceof Error
				? e
				: new Error('value thrown that was not an Error', { cause: e }),
		);

	constructor(
		message: string,
		public status: number,
		public responseBody: string,
		public responseHeaders: Record<string, string>,
		cause?: Error,
	) {
		super(message, { cause });
		this.name = this.constructor.name;
	}
}

export type RestResult = {
	status: number;
	responseBody: string;
	responseHeaders: Record<string, string>;
};

export class ZuoraClient {
	static async create(stage: Stage) {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
		return new ZuoraClient(stage, bearerTokenProvider);
	}
	protected zuoraServerUrl: string;
	constructor(
		stage: Stage,
		private tokenProvider: BearerTokenProvider,
	) {
		this.zuoraServerUrl = zuoraServerUrl(stage).replace(/\/$/, ''); // remove trailing slash
	}

	public async get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetchWithLogging(logger.getCallerInfo(1))(
			path,
			'GET',
			schema,
		);
	}

	public async post<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetchWithLogging(logger.getCallerInfo(1))(
			path,
			'POST',
			schema,
			body,
			headers,
		);
	}

	public async put<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetchWithLogging(logger.getCallerInfo(1))(
			path,
			'PUT',
			schema,
			body,
			headers,
		);
	}

	public async delete<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetchWithLogging(logger.getCallerInfo(1))(
			path,
			'DELETE',
			schema,
		);
	}

	// has to be a function so that the callerInfo is refreshed on every call
	fetchWithLogging = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetchWithZuoraResponseHandling.bind(this),
			() => 'HTTP ' + this.zuoraServerUrl,
			this.fetchWithZuoraResponseHandling.toString(),
			2,
			maybeCallerInfo,
		);

	private async fetch<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		const bearerToken = await this.tokenProvider.getBearerToken();
		const url = `${this.zuoraServerUrl}/${path.replace(/^\//, '')}`;
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${bearerToken.access_token}`,
				'Content-Type': 'application/json',
				...headers,
			},
			body,
		});
		const responseBody = await response.text();

		const responseHeaders: Record<string, string> = Object.fromEntries(
			[...response.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]),
		);
		const result: RestResult = {
			status: response.status,
			responseBody,
			responseHeaders,
		};
		if (!response.ok) {
			throw RestClientError.create('http call failed', result);
		}

		try {
			const json: unknown = JSON.parse(result.responseBody);
			return schema.parse(json);
		} catch (e) {
			throw RestClientError.create('parsing failure', result, e);
		}
	}

	/*
	 * a normal RestClient throws non-2xx responses as Errors.  For Zuora, there are an extra layer of errors that
	 * come back as 200 responses, and thus need their own special errors thrown.
	 */
	async fetchWithZuoraResponseHandling<
		I,
		O,
		T extends z.ZodType<O, ZodTypeDef, I>,
	>(
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
			return await this.fetch(path, method, successSchema, body, headers);
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
				} catch (parseError) {
					// we're not going to be able to extract anything useful from non-json
					throw e;
				}
				throw generateZuoraError(parsedBody, e);
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
