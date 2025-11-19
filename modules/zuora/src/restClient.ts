import { logger } from '@modules/routing/logger';
import type z from 'zod';

export class RestClientError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public body: string,
		public headers: Record<string, string>,
	) {
		super(message);
		this.name = this.constructor.name;
	}
}

export type RestResult = {
	response: Response;
	responseBody: string;
	responseHeaders: Record<string, string>;
};

export abstract class RestClient {
	protected constructor(readonly restServerUrl: string) {}

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

		const json: unknown = JSON.parse(result.responseBody);
		if (!this.isLogicalSuccess || this.isLogicalSuccess(json)) {
			return schema.parse(json);
		} else {
			throw this.onFailure(result);
		}
	}

	private onFailure(result: RestResult) {
		if (this.generateError) {
			return this.generateError(result);
		}

		return new RestClientError(
			'http call failed',
			result.response.status,
			result.responseBody,
			result.responseHeaders,
		);
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
		const result: RestResult = { response, responseBody, responseHeaders };
		if (!response.ok) {
			throw this.onFailure(result);
		}

		return result;
	}

	/**
	 * if a request is deemed to have failed, you can return a custom Error to be thrown.
	 * If this method is undefined, the default but verbose RestHttpError will be thrown.
	 * @param result
	 * @protected
	 */
	protected generateError?: (result: RestResult) => Error;

	/**
	 * This function, if defined, will get the chance to mark 200 responses as failed
	 * (therefore send to generateError) based on the json body.
	 * @param json
	 * @protected
	 */
	protected isLogicalSuccess?: (json: unknown) => boolean;

	/**
	 * Provide any Authorization headers via this method.  They will be sent but not logged.
	 * @protected
	 */
	protected abstract getAuthHeaders: () => Promise<Record<string, string>>;
}
