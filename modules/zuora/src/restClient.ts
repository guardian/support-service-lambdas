import { getCallerInfo } from '@modules/routing/getCallerInfo';
import { logger } from '@modules/routing/logger';
import { prettyPrint } from '@modules/routing/prettyPrint';
import type z from 'zod';
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

	public async get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetchWithLogging(getCallerInfo(1))(path, 'GET', schema);
	}

	public async post<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetchWithLogging(getCallerInfo(1))(
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
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PUT',
			schema,
			body,
			headers,
		);
	}

	public async patch<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetchWithLogging(getCallerInfo(1))(
			path,
			'PATCH',
			schema,
			body,
			headers,
		);
	}

	public async delete<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
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
			([path, method, , body, headers]) =>
				[`${method} ${path}`, prettyPrint(body), prettyPrint(headers)].join(
					'\n',
				),
			([path, method]) => `${method} ${path}`,
		);

	protected async fetch<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		const authorisation = await this.tokenProvider.getAuthorisation();
		const pathWithoutLeadingSlash = path.replace(/^\//, '');
		const url = `${authorisation.baseUrl}/${pathWithoutLeadingSlash}`;
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
			const json: unknown = JSON.parse(result.responseBody);
			return schema.parse(json);
		} catch (e) {
			throw new RestClientError('parsing failure', result, e);
		}
	}
}
