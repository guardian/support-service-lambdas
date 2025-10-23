import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { getAppBaseUrl } from './getAppBaseUrl';

interface DocsClientConfig {
	stage: Stage;
}

interface DocsResponse {
	body: string;
	statusCode: number;
	headers: Record<string, string>;
}

// keep in step with cdk resource extractors
export type ProxyTarget = { targetApp: string; targetPath: string };

export class ProxyClient {
	private constructor(private config: DocsClientConfig) {}

	static create(config: DocsClientConfig, stage: Stage): ProxyClient {
		logger.log('Creating docs client', stage);
		return new ProxyClient(config);
	}

	get = logger.wrapFn(
		this.getWithoutLogging.bind(this),
		() => 'HTTP proxy',
		this.getWithoutLogging.toString(),
		2,
		logger.getCallerInfo(),
	);

	private async getWithoutLogging(
		target: ProxyTarget,
		headers?: Record<string, string>,
	): Promise<DocsResponse> {
		const url = `${getAppBaseUrl(this.config.stage, target.targetApp)}/${target.targetPath}`;

		logger.log('calculated backend url: ' + url);

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
		});

		const body = await response.text();

		return {
			body,
			statusCode: response.status,
			headers: Object.fromEntries(response.headers.entries()),
		};
	}
}

export function createDocsClient(stage: Stage): ProxyClient {
	// const baseUrl = getDocsBaseUrl(stage);
	return ProxyClient.create({ stage }, stage);
}
