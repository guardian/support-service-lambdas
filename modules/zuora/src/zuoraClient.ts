import type { Stage } from '@modules/stage';
import type { z } from 'zod';
import { Logger } from '@modules/zuora/logger';
import { BearerTokenProvider } from './bearerTokenProvider';
import { zuoraServerUrl } from './common';
import { getOAuthClientCredentials } from './oAuthCredentials';

export class ZuoraError extends Error {
	constructor(
		message: string,
		public code: number,
	) {
		super(message);
	}
}

export class ZuoraClient {
	static async create(stage: Stage, logger: Logger = new Logger()) {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
		return new ZuoraClient(stage, bearerTokenProvider, logger);
	}
	protected zuoraServerUrl: string;
	constructor(
		stage: Stage,
		private tokenProvider: BearerTokenProvider,
		private logger: Logger,
	) {
		this.zuoraServerUrl = zuoraServerUrl(stage).replace(/\/$/, ''); // remove trailing slash
	}

	public async get<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetch(path, 'GET', schema);
	}

	public async post<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetch(path, 'POST', schema, body, headers);
	}

	public async put<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		body: string,
		schema: T,
		headers?: Record<string, string>,
	): Promise<O> {
		return await this.fetch(path, 'PUT', schema, body, headers);
	}

	public async delete<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		schema: T,
	): Promise<O> {
		return await this.fetch(path, 'DELETE', schema);
	}

	public async fetch<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		const bearerToken = await this.tokenProvider.getBearerToken();
		const url = `${this.zuoraServerUrl}/${path.replace(/^\//, '')}`;
		this.logger.log(`${method} ${url} ${body ? `with body ${body}` : ''}`);
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${bearerToken.access_token}`,
				'Content-Type': 'application/json',
				...headers,
			},
			body,
		});
		const json = await response.json();
		this.logger.log('Response from Zuora was: ', JSON.stringify(json, null, 2));

		// Check both HTTP status and logical success
		// Some Zuora endpoints return HTTP 200 with success: false for logical errors
		const isHttpSuccess = response.ok;
		const isLogicalSuccess = (json as any).success === true; // Only explicit true is considered success

		if (isHttpSuccess && isLogicalSuccess) {
			return schema.parse(json);
		} else {
			this.logger.error('Error response body:', JSON.stringify(json, null, 2));

			// Extract detailed error information from different Zuora response formats
			let errorMessage = response.statusText || 'Zuora API Error';
			const errorBody = json as any;

			// Format 1: reasons array (authentication, account errors)
			if (errorBody.reasons && Array.isArray(errorBody.reasons)) {
				const reasons = errorBody.reasons
					.map((reason: any) => `${reason.code}: ${reason.message}`)
					.join('; ');
				errorMessage = reasons;
			}
			// Format 2: Errors array (object API errors)
			else if (errorBody.Errors && Array.isArray(errorBody.Errors)) {
				const errors = errorBody.Errors.map(
					(error: any) => `${error.Code}: ${error.Message}`,
				).join('; ');
				errorMessage = errors;
			}
			// Format 3: FaultCode/FaultMessage (query errors)
			else if (errorBody.FaultCode && errorBody.FaultMessage) {
				errorMessage = `${errorBody.FaultCode}: ${errorBody.FaultMessage}`;
			}
			// Format 4: Simple code/message
			else if (errorBody.code && errorBody.message) {
				errorMessage = `${errorBody.code}: ${errorBody.message}`;
			}

			if (response.status === 429) {
				this.logger.log(response.headers);
			}

			throw new ZuoraError(errorMessage, response.status);
		}
	}
}
