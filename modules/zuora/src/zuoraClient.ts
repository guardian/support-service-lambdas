import type { Stage } from '@modules/stage';
import type { z } from 'zod';
import { Logger } from '@modules/zuora/logger';
import { BearerTokenProvider } from './bearerTokenProvider';
import { zuoraServerUrl } from './common';
import { getOAuthClientCredentials } from './oAuthCredentials';

// Type definitions for Zuora response formats
type ZuoraReason = {
	code: string;
	message: string;
};

type ZuoraErrorItem = {
	Code: string;
	Message: string;
};

type ZuoraResponse = {
	// Success indicators (some endpoints use different casing)
	success?: boolean;
	Success?: boolean;
	// Error details in various formats
	reasons?: ZuoraReason[];
	Errors?: ZuoraErrorItem[];
	FaultCode?: string;
	FaultMessage?: string;
	code?: string;
	message?: string;
};

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
		const json = (await response.json()) as ZuoraResponse;
		this.logger.log('Response from Zuora was: ', JSON.stringify(json, null, 2));

		// Check both HTTP status and logical success
		// Some Zuora endpoints return HTTP 200 with success: false for logical errors
		const isHttpSuccess = response.ok;
		const hasLowercaseSuccess = 'success' in json && Boolean(json.success);
		const hasUppercaseSuccess = 'Success' in json && Boolean(json.Success);
		const isLogicalSuccess = hasLowercaseSuccess || hasUppercaseSuccess;

		if (isHttpSuccess && isLogicalSuccess) {
			return schema.parse(json);
		} else {
			this.logger.error('Error response body:', JSON.stringify(json, null, 2));

			// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
			if (response.status === 429) {
				this.logger.log(response.headers);
			}

			// Extract detailed error information from different Zuora response formats
			const statusText = response.statusText || 'Zuora API Error';

			// Format 1: reasons array (authentication, account errors)
			if (json.reasons && Array.isArray(json.reasons)) {
				const reasons = json.reasons
					.map((reason: ZuoraReason) => `${reason.code}: ${reason.message}`)
					.join('; ');
				throw new ZuoraError(`${statusText}: ${reasons}`, response.status);
			}
			// Format 2: Errors array (object API errors)
			if (json.Errors && Array.isArray(json.Errors)) {
				const errors = json.Errors.map(
					(error: ZuoraErrorItem) => `${error.Code}: ${error.Message}`,
				).join('; ');
				throw new ZuoraError(`${statusText}: ${errors}`, response.status);
			}
			// Format 3: FaultCode/FaultMessage (query errors)
			if (json.FaultCode && json.FaultMessage) {
				throw new ZuoraError(
					`${statusText}: ${json.FaultCode}: ${json.FaultMessage}`,
					response.status,
				);
			}
			// Format 4: Simple code/message
			if (json.code && json.message) {
				throw new ZuoraError(
					`${statusText}: ${json.code}: ${json.message}`,
					response.status,
				);
			}

			// Fallback if no specific error format is found
			throw new ZuoraError(statusText, response.status);
		}
	}
}
