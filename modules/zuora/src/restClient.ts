import type { z, ZodType } from 'zod';
import { groupMap } from '@modules/arrayFunctions';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { BearerTokenProvider } from '@modules/zuora/auth';

export type RestResponseSchema<RESPONSE = unknown> =
	| ZodType<RESPONSE>
	| ((body: string, contentType?: string) => RESPONSE);

export type RestResult = {
	status: number;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- either string or json
	responseBody: string | unknown;
	responseHeaders: Record<string, string>;
	statusText?: string;
};

export type RestResultWithBody<RESPONSE> = Omit<RestResult, 'responseBody'> & {
	responseBody: RESPONSE;
};

export class RestClientError extends Error implements RestResult {
	public status: number;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- either body string or json
	public responseBody: string | unknown;
	public responseHeaders: Record<string, string>;
	public statusText?: string;

	constructor(message: string, restResult: RestResult, cause?: unknown) {
		super(message, { cause });
		this.name = this.constructor.name;
		this.status = restResult.status;
		this.responseBody = restResult.responseBody;
		this.responseHeaders = restResult.responseHeaders;
		this.statusText = restResult.statusText;
	}

	public toJSON() {
		return {
			name: this.name,
			message: this.message,
			status: this.status,
			statusText: this.statusText,
			responseHeaders: this.responseHeaders,
		};
	}
}

export class RestClientNetworkError extends Error {
	constructor() {
		super('REST request failed at the network layer');
		this.name = this.constructor.name;
	}
}

export abstract class RestClient {
	public constructor(
		readonly tokenProvider: BearerTokenProvider,
		private readonly fetchFn?: typeof fetch,
	) {}

	public async get<S extends ZodType>(
		path: string,
		schema: S,
		urlSearchParams?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'GET',
			schema,
			undefined,
			undefined,
			urlSearchParams,
			timeoutInMilliseconds,
		);
	}

	public async getWithStatus<RESPONSE>(
		path: string,
		schema: RestResponseSchema<RESPONSE>,
		urlSearchParams?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<RestResultWithBody<RESPONSE>> {
		return await this.fetchWithResponseLogging(getCallerInfo(1))(
			path,
			'GET',
			schema,
			undefined,
			undefined,
			urlSearchParams,
			timeoutInMilliseconds,
		);
	}

	public async post<S extends ZodType>(
		path: string,
		body: string,
		schema: S,
		headers?: Record<string, string>,
		timeoutInMilliseconds?: number,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'POST',
			schema,
			body,
			headers,
			undefined,
			timeoutInMilliseconds,
		);
	}

	public async postWithStatus<RESPONSE>(
		path: string,
		body: string | undefined,
		schema: RestResponseSchema<RESPONSE>,
		headers?: Record<string, string>,
		timeoutInMilliseconds?: number,
	): Promise<RestResultWithBody<RESPONSE>> {
		return await this.fetchWithResponseLogging(getCallerInfo(1))(
			path,
			'POST',
			schema,
			body,
			headers,
			undefined,
			timeoutInMilliseconds,
		);
	}

	public async put<S extends ZodType>(
		path: string,
		body: string,
		schema: S,
		headers?: Record<string, string>,
		timeoutInMilliseconds?: number,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PUT',
			schema,
			body,
			headers,
			undefined,
			timeoutInMilliseconds,
		);
	}

	public async patch<S extends ZodType>(
		path: string,
		body: string,
		schema: S,
		headers?: Record<string, string>,
		timeoutInMilliseconds?: number,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PATCH',
			schema,
			body,
			headers,
			undefined,
			timeoutInMilliseconds,
		);
	}

	public async delete<S extends ZodType>(
		path: string,
		schema: S,
		timeoutInMilliseconds?: number,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'DELETE',
			schema,
			undefined,
			undefined,
			undefined,
			timeoutInMilliseconds,
		);
	}

	public async getStream(
		path: string,
		timeoutInMilliseconds?: number,
	): Promise<ReadableStream<Uint8Array>> {
		return await this.fetchStreamWithLogging(getCallerInfo(1))(
			path,
			'GET',
			undefined,
			undefined,
			undefined,
			timeoutInMilliseconds,
		);
	}

	// has to be a function so that the callerInfo is refreshed on every call
	fetchWithLogging = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetch.bind(this),
			() => 'HTTP ' + this.constructor.name,
			maybeCallerInfo,
			([path, method, , body, , params]) =>
				this.loggableRequest(path, method, body, params),
		);

	fetchWithResponseLogging = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetchWithResponse.bind(this),
			() => 'HTTP ' + this.constructor.name,
			maybeCallerInfo,
			([path, method, , body, , params]) =>
				this.loggableRequest(path, method, body, params),
		);

	fetchStreamWithLogging = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetchStream.bind(this),
			() => 'HTTP ' + this.constructor.name,
			maybeCallerInfo,
			([path, method, body, , params]) =>
				this.loggableRequest(path, method, body, params),
		);

	protected async fetch<S extends ZodType>(
		path: string,
		method: string,
		schema: S,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<z.infer<S>> {
		const response = await this.fetchWithResponse(
			path,
			method,
			schema,
			body,
			headers,
			params,
			timeoutInMilliseconds,
		);
		return response.responseBody;
	}

	protected async fetchWithResponse<S extends ZodType>(
		path: string,
		method: string,
		schema: S,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<RestResultWithBody<z.infer<S>>>;

	protected async fetchWithResponse<RESPONSE>(
		path: string,
		method: string,
		schema: RestResponseSchema<RESPONSE>,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<RestResultWithBody<RESPONSE>>;

	protected async fetchWithResponse<RESPONSE>(
		path: string,
		method: string,
		schema: RestResponseSchema<RESPONSE>,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<RestResultWithBody<RESPONSE>> {
		const response = await this.makeRequest(
			path,
			method,
			body,
			headers,
			params,
			timeoutInMilliseconds,
		);
		const responseBody = await response.text();
		const result: RestResult = {
			status: response.status,
			responseBody,
			responseHeaders: this.getResponseHeaders(response),
			statusText: response.statusText,
		};

		let parsedResponseBody: unknown = responseBody;
		try {
			parsedResponseBody = responseBody ? JSON.parse(responseBody) : {};
		} catch (error) {
			if (!response.ok) {
				throw new RestClientError(`http call failed: ${result.status}`, result);
			}

			if (typeof schema !== 'function') {
				throw new RestClientError('json parsing failure', result, error);
			}
		}

		const resultWithParsedBody: RestResult = {
			...result,
			responseBody: parsedResponseBody,
		};
		if (!response.ok) {
			throw new RestClientError(
				`http call failed: ${result.status}`,
				resultWithParsedBody,
			);
		}

		try {
			const parsed =
				typeof schema === 'function'
					? schema(responseBody, this.getContentType(response))
					: schema.parse(parsedResponseBody);
			return { ...resultWithParsedBody, responseBody: parsed };
		} catch (error) {
			throw new RestClientError(
				typeof schema === 'function'
					? 'response parsing failure'
					: 'schema parsing failure',
				resultWithParsedBody,
				error,
			);
		}
	}

	protected async fetchStream(
		path: string,
		method: string,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<ReadableStream<Uint8Array>> {
		const response = await this.makeRequest(
			path,
			method,
			body,
			headers,
			params,
			timeoutInMilliseconds,
		);
		if (!response.ok) {
			await this.throwHttpError(response);
		}

		if (response.body === null) {
			throw new Error('no http response body');
		}

		return response.body;
	}

	private loggableRequest(
		path: string,
		method: string,
		body: string | undefined,
		params: URLSearchParams | undefined,
	) {
		return {
			logOnEntryAndExit: `${method} ${path}`,
			logOnEntryOnly:
				body !== undefined || params !== undefined
					? [
							{
								urlSearchParams:
									params !== undefined
										? groupMap(
												[...params.entries()],
												([key]) => key,
												([, value]) => value,
											)
										: undefined,
								body,
							},
						]
					: undefined,
		};
	}

	private async makeRequest(
		path: string,
		method: string,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
		timeoutInMilliseconds?: number,
	): Promise<Response> {
		const authorisation = await this.tokenProvider.getAuthorisation();
		const baseUrl = authorisation.baseUrl.replace(/\/+$/, '');
		const pathWithoutLeadingSlashes = path.replace(/^\/+/, '');
		const url = `${baseUrl}/${pathWithoutLeadingSlashes}${params === undefined ? '' : '?' + params.toString()}`;

		try {
			return await (this.fetchFn ?? fetch)(url, {
				method,
				headers: {
					...authorisation.authHeaders,
					'Content-Type': 'application/json',
					...headers,
				},
				body,
				signal:
					timeoutInMilliseconds === undefined
						? undefined
						: AbortSignal.timeout(timeoutInMilliseconds),
			});
		} catch {
			throw new RestClientNetworkError();
		}
	}

	private async throwHttpError(response: Response): Promise<never> {
		const responseBody = await response.text();
		const result: RestResult = {
			status: response.status,
			responseBody,
			responseHeaders: this.getResponseHeaders(response),
			statusText: response.statusText,
		};

		try {
			result.responseBody = responseBody ? JSON.parse(responseBody) : {};
		} catch {
			// Keep the raw response body when a non-JSON HTTP error is returned.
		}

		throw new RestClientError(`http call failed: ${result.status}`, result);
	}

	private getResponseHeaders(response: Response): Record<string, string> {
		return Object.fromEntries(
			[...response.headers.entries()].map(([key, value]) => [
				key.toLowerCase(),
				value,
			]),
		);
	}

	private getContentType(response: Response): string | undefined {
		return response.headers
			.get('content-type')
			?.split(';', 1)[0]
			?.trim()
			.toLowerCase();
	}
}
