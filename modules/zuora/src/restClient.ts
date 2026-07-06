import type { z, ZodType } from 'zod';
import { groupMap } from '@modules/arrayFunctions';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { BearerTokenProvider } from '@modules/zuora/auth';

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

	public async get<S extends ZodType>(
		path: string,
		schema: S,
		urlSearchParams?: URLSearchParams,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'GET',
			schema,
			undefined,
			undefined,
			urlSearchParams,
		);
	}

	public async post<S extends ZodType>(
		path: string,
		body: string,
		schema: S,
		headers?: Record<string, string>,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'POST',
			schema,
			body,
			headers,
		);
	}

	public async put<S extends ZodType>(
		path: string,
		body: string,
		schema: S,
		headers?: Record<string, string>,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PUT',
			schema,
			body,
			headers,
		);
	}

	public async patch<S extends ZodType>(
		path: string,
		body: string,
		schema: S,
		headers?: Record<string, string>,
	): Promise<z.infer<S>> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PATCH',
			schema,
			body,
			headers,
		);
	}

	public async delete<S extends ZodType>(
		path: string,
		schema: S,
	): Promise<z.infer<S>> {
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

	protected async fetch<S extends ZodType>(
		path: string,
		method: string,
		schema: S,
		body?: string,
		headers?: Record<string, string>,
		params?: URLSearchParams,
	): Promise<z.infer<S>> {
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
