import type { Stage } from '@modules/stage';
import type { z } from 'zod';
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
	static async create(stage: Stage) {
		const credentials = await getOAuthClientCredentials(stage);
		const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
		return new ZuoraClient(stage, bearerTokenProvider);
	}
	private zuoraServerUrl: string;
	constructor(
		stage: Stage,
		private tokenProvider: BearerTokenProvider,
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

	private async fetch<I, O, T extends z.ZodType<O, z.ZodTypeDef, I>>(
		path: string,
		method: string,
		schema: T,
		body?: string,
		headers?: Record<string, string>,
	): Promise<O> {
		const bearerToken = await this.tokenProvider.getBearerToken();
		const url = `${this.zuoraServerUrl}/${path.replace(/^\//, '')}`;
		console.log(`${method} ${url} ${body ? `with body ${body}` : ''}`);
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
		console.log('Response from Zuora was: ', JSON.stringify(json, null, 2));

		if (response.ok) {
			return schema.parse(json);
		} else {
			console.error(response.text);

			if (response.status === 429) {
				console.log(response.headers);
			}

			throw new ZuoraError(response.statusText, response.status);
		}
	}
}
