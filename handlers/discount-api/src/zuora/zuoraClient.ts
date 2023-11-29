import type { z } from 'zod';
import type { Stage } from '../../../../modules/Stage';
import type { BearerTokenProvider } from './bearerTokenProvider';
import { zuoraServerUrl } from './common';

export class ZuoraClient {
	private zuoraServerUrl: string;
	constructor(
		stage: Stage,
		private tokenProvider: BearerTokenProvider,
	) {
		this.zuoraServerUrl = zuoraServerUrl(stage).replace(/\/$/, ''); // remove trailing slash
	}

	public async get<T>(path: string, schema: z.ZodType<T>) {
		return await this.fetch(path, 'GET', schema);
	}

	public async post<T>(path: string, body: string, schema: z.ZodType<T>) {
		return await this.fetch(path, 'POST', schema, body);
	}

	public async put<T>(path: string, body: string, schema: z.ZodType<T>) {
		return await this.fetch(path, 'PUT', schema, body);
	}

	private async fetch<T>(
		path: string,
		method: string,
		schema: z.ZodType<T>,
		body?: string,
	): Promise<T> {
		const bearerToken = await this.tokenProvider.getBearerToken();
		const url = `${this.zuoraServerUrl}/${path.replace(/^\//, '')}`;
		console.log(`${method} ${url} ${body ? `with body ${body}` : ''}`);
		const response = await fetch(url, {
			method,
			headers: {
				Authorization: `Bearer ${bearerToken.access_token}`,
				'Content-Type': 'application/json',
			},
			body,
		});
		const json = await response.json();
		console.log('Response from Zuora was: ', JSON.stringify(json));
		if (response.ok) {
			return schema.parse(json);
		} else {
			throw new Error(
				`Error in ZuoraClient.fetch: ${response.status} ${response.statusText}`,
			);
		}
	}
}
