import { logger } from '@modules/routing/logger';
import { Try } from '@modules/try';
import type z from 'zod';

export class RestClientError extends Error implements RestResult {
	constructor(
		message: string,
		public statusCode: number,
		public responseBody: string,
		public responseHeaders: Record<string, string>,
		cause?: Error,
	) {
		super(message, { cause });
		this.name = this.constructor.name;
	}
}

export type RestResult = {
	statusCode: number;
	responseBody: string;
	responseHeaders: Record<string, string>;
};

export interface RestClient<U> {
	get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O>;

	getRaw(path: string): Promise<RestResult>;

	post<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O>;

	put<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O>;

	delete<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O>;

	__brand: U;
}

export class RestClientImpl<U> implements RestClient<U> {
	public constructor(
		readonly restServerUrl: string,
		readonly getAuthHeaders: () => Promise<Record<string, string>>,
		readonly __brand: U,
	) {}

	public async get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetch(logger.getCallerInfo(1))(path, 'GET', schema);
	}

	public async getRaw(path: string): Promise<RestResult> {
		return await this.fetchRawBody(logger.getCallerInfo(1))(path, 'GET');
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
			() => 'HTTP ' + this.restServerUrl,
			this.fetchWithoutLogging.toString(),
			2,
			maybeCallerInfo,
		);

	private async fetchWithoutLogging<
		I,
		O,
		T extends z.ZodType<O, z.ZodTypeDef, I>,
	>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		const result = await this.fetchRawBodyWithoutLogging(
			path,
			method,
			headers,
			body,
		);

		return Try((): unknown => JSON.parse(result.responseBody))
			.map((json) => schema.parse(json))
			.mapError(
				(e) =>
					new RestClientError(
						'parsing failure',
						result.statusCode,
						result.responseBody,
						result.responseHeaders,
						e,
					),
			)
			.get();
	}

	// has to be a function so that the callerInfo is refreshed on every call
	fetchRawBody = (maybeCallerInfo?: string) =>
		logger.wrapFn(
			this.fetchRawBodyWithoutLogging.bind(this),
			() => 'HTTP ' + this.restServerUrl,
			this.fetchRawBodyWithoutLogging.toString(),
			2,
			maybeCallerInfo,
		);

	private async fetchRawBodyWithoutLogging(
		path: string,
		method: string,
		headers?: Record<string, string>,
		body?: string,
	) {
		const authHeaders = await this.getAuthHeaders();
		const pathWithoutLeadingSlash = path.replace(/^\//, '');
		const url = `${this.restServerUrl}/${pathWithoutLeadingSlash}`;
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
			statusCode: response.status,
			responseBody,
			responseHeaders,
		};
		if (!response.ok) {
			throw new RestClientError(
				'http call failed',
				result.statusCode,
				result.responseBody,
				result.responseHeaders,
			);
		}

		return result;
	}
}
