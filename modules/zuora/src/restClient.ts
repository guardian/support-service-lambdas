import { groupMap } from '@modules/arrayFunctions';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { BearerTokenProvider } from '@modules/zuora/auth';
import type { ZodType, ZodTypeDef } from 'zod';

export class RestClientError extends Error implements RestResult {
	public status: number;
	public responseBody: string;
	public responseHeaders: Record<string, string>;

	constructor(message: string, restResult: RestResult, cause?: unknown) {
		super(message, { cause });
		this.name = this.constructor.name;
		this.status = restResult.status;
		this.responseBody = restResult.responseBody;
		this.responseHeaders = restResult.responseHeaders;
	}
}

export type RestResult = {
	status: number;
	responseBody: string;
	responseHeaders: Record<string, string>;
};

export abstract class RestClient {
	public constructor(readonly tokenProvider: BearerTokenProvider) {}

	public async get<T>(
		path: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
		urlSearchParams?: URLSearchParams,
	): Promise<T> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'GET',
			schema,
			undefined,
			undefined,
			urlSearchParams,
		);
	}

	public async post<T>(
		path: string,
		body: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
		headers?: Record<string, string>,
	): Promise<T> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'POST',
			schema,
			body,
			headers,
		);
	}

	public async put<T>(
		path: string,
		body: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
		headers?: Record<string, string>,
	): Promise<T> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PUT',
			schema,
			body,
			headers,
		);
	}

	public async patch<T>(
		path: string,
		body: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
		headers?: Record<string, string>,
	): Promise<T> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PATCH',
			schema,
			body,
			headers,
		);
	}

	public async delete<T>(
		path: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
	): Promise<T> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'DELETE',
			schema,
		);
	}

	// has to be a function so that the callerInfo is refreshed on every call
	fetchWithLogging = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetch.bind(this),
			() => 'HTTP ' + this.constructor.name,
			maybeCallerInfo,
			([path, method, , body, headers, params]) => ({
				logOnEntryAndExit: `${method} ${path}`,
				logOnEntryOnly:
					body !== undefined || headers !== undefined || params !== undefined
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
									headers,
								},
							]
						: undefined,
			}),
		);

	protected async fetch<T>(
		path: string,
		method: string,
		schema: ZodType<T, ZodTypeDef, unknown>,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
	): Promise<T> {
		const authorisation = await this.tokenProvider.getAuthorisation();
		const pathWithoutLeadingSlash = path.replace(/^\//, '');
		const url = `${authorisation.baseUrl}/${pathWithoutLeadingSlash}${params === undefined ? '' : '?' + params.toString()}`;
		const response = await fetch(url, {
			method,
			headers: {
				...authorisation.authHeaders,
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
			throw new RestClientError('http call failed', result);
		}

		try {
			const json: unknown = responseBody ? JSON.parse(responseBody) : {};
			return schema.parse(json);
		} catch (e) {
			throw new RestClientError('parsing failure', result, e);
		}
	}
}
