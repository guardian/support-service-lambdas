import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';

interface DocsClientConfig {
	baseUrl: string;
}

interface DocsResponse {
	body: string;
	statusCode: number;
	headers: Record<string, string>;
}

export class PrivateClient {
	private constructor(private config: DocsClientConfig) {}

	static create(config: DocsClientConfig, stage: Stage): PrivateClient {
		logger.log('Creating docs client', { baseUrl: config.baseUrl, stage });
		return new PrivateClient(config);
	}

	async get(
		path: string,
		headers?: Record<string, string>,
	): Promise<DocsResponse> {
		const url = `${this.config.baseUrl}${path}`;

		logger.log('Making GET request to docs endpoint', { url, headers });

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
		});

		const body = await response.text();

		logger.log('Received response from docs endpoint', {
			url,
			statusCode: response.status,
			headers: Object.fromEntries(response.headers.entries()),
			bodyLength: body.length,
			body,
		});

		return {
			body,
			statusCode: response.status,
			headers: Object.fromEntries(response.headers.entries()),
		};
	}
}

export function getDocsBaseUrl(stage: Stage): string {
	switch (stage) {
		case 'CODE':
			return 'https://discount-api-code.support.guardianapis.com';
		case 'PROD':
			return 'https://discount-api.support.guardianapis.com';
	}
}

export function createDocsClient(stage: Stage): PrivateClient {
	const baseUrl = getDocsBaseUrl(stage);
	return PrivateClient.create({ baseUrl }, stage);
}
