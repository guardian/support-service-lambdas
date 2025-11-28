import type { Stage } from '@modules/stage';
import type { RestResult } from '@modules/zuora/restClient';
import type { RestClient } from '@modules/zuora/restClient';
import { RestClientImpl } from '@modules/zuora/restClient';
import { RestClientError } from '@modules/zuora/restClient';
import { getAppBaseUrl } from './getAppBaseUrl';

export interface UpstreamApiResponse {
	body: string;
	statusCode: number;
	headers: Record<string, string>;
}

// keep in step with cdk resource extractors
export type UpstreamApiTarget = { targetApp: string; targetPath: string };

export class UpstreamApiClient {
	private readonly restClient: RestClient<'UpstreamApiClient'>;
	constructor(
		stage: Stage,
		app: string,
		private auth: string,
	) {
		this.restClient = new RestClientImpl(
			getAppBaseUrl(stage, app),
			() =>
				Promise.resolve({
					Authorization: `Bearer ${this.auth}`,
				}),
			'UpstreamApiClient',
		);
	}

	getAuthHeaders = async () =>
		Promise.resolve({
			Authorization: `Bearer ${this.auth}`,
		});

	getResource: (path: string) => Promise<UpstreamApiResponse> = async (
		path: string,
	) => {
		let result: RestResult;
		try {
			result = await this.restClient.getRaw(path);
		} catch (e) {
			// all 4xx/5xx are thrown by default - however unauthenticated is actually a valid case for our clients
			if (
				e instanceof RestClientError &&
				(e.statusCode === 401 || e.statusCode === 403)
			) {
				return {
					body: e.responseBody,
					statusCode: e.statusCode,
					headers: e.responseHeaders,
				} satisfies UpstreamApiResponse;
			}
			throw e;
		}
		const { statusCode, responseBody, responseHeaders } = result;
		return {
			body: responseBody,
			statusCode: statusCode, // non 2xx will get thrown as 5xx errors
			headers: responseHeaders,
		} satisfies UpstreamApiResponse;
	};
}
