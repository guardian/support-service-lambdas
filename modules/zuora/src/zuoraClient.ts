import type { z } from 'zod';
import type { Stage } from '@modules/stage';
import { Logger } from '@modules/logger';
import { BearerTokenProvider } from './auth/bearerTokenProvider';
import { getOAuthClientCredentials } from './auth/oAuthCredentials';
import { zuoraServerUrl } from './common';
import { generateZuoraError } from './zuoraErrorHandler';
import type { ZuoraResponse } from './types/httpResponse';

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

		if (isHttpSuccess && isLogicalSuccess(json, path)) {
			return schema.parse(json);
		} else {
			// When Zuora returns a 429 status, the response headers typically contain important rate limiting information
			if (response.status === 429) {
				this.logger.log(response.headers);
			}

			throw generateZuoraError(json, response);
		}
	}
}

const isLogicalSuccess = (json: ZuoraResponse, path: string): Boolean => {
	const hasLowercaseSuccess = 'success' in json && Boolean(json.success);
	const hasUppercaseSuccess = 'Success' in json && Boolean(json.Success);

	// For endpoints that explicitly include success fields
	if (hasLowercaseSuccess || hasUppercaseSuccess) {
		return true;
	}

	// For other endpoints, check for absence of error indicators
	const hasErrorIndicators =
		json.reasons || json.Errors || json.FaultCode || json.code;
	return !hasErrorIndicators;
};
