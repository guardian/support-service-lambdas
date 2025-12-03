import { logger } from '@modules/routing/logger';
import type z from 'zod';
import { BearerTokenProvider } from '@modules/zuora/auth';

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

export abstract class RestClient {
	public baseUrl: string;
	protected constructor(
		restServerUrl: string,
		readonly tokenProvider?: BearerTokenProvider,
	) {
		this.baseUrl = restServerUrl.replace(/\/$/, '');
	}

	public async get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetch(logger.getCallerInfo(1))(path, 'GET', schema);
	}

	public async post<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetch(logger.getCallerInfo(1))(
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
		return await this.fetch(logger.getCallerInfo(1))(
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
		return await this.fetch(logger.getCallerInfo(1))(path, 'DELETE', schema);
	}

	// has to be a function so that the callerInfo is refreshed on every call
	fetch = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetchWithoutLogging.bind(this),
			() => 'HTTP ' + this.baseUrl,
			this.fetchWithoutLogging.toString(),
			2,
			maybeCallerInfo,
		);

	async fetchWithoutLogging<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		const authHeaders = this.tokenProvider
			? await this.tokenProvider.getAuthHeader()
			: {};
		const pathWithoutLeadingSlash = path.replace(/^\//, '');
		const url = `${this.baseUrl}/${pathWithoutLeadingSlash}`;
		const response = await fetch(url, {
			method,
			headers: {
				...authHeaders,
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
}
