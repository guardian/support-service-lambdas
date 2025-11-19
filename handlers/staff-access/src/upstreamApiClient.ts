import type { Stage } from '@modules/stage';
import type { RestResult } from '@modules/zuora/restClient';
import { RestClient, RestClientError } from '@modules/zuora/restClient';
import { getAppBaseUrl } from './getAppBaseUrl';

export interface UpstreamApiResponse {
	body: string;
	statusCode: number;
	headers: Record<string, string>;
}

// keep in step with cdk resource extractors
export type UpstreamApiTarget = { targetApp: string; targetPath: string };

export class UpstreamApiClient extends RestClient {
	constructor(
		stage: Stage,
		app: string,
		private auth: string,
	) {
		super(getAppBaseUrl(stage, app));
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
			result = await this.getRaw(path);
		} catch (e) {
			// all 4xx/5xx are thrown by default - however unauthenticated is actually a valid case for our clients
			if (
				e instanceof RestClientError &&
				(e.statusCode === 401 || e.statusCode === 403)
			) {
				return {
					body: e.body,
					statusCode: e.statusCode,
					headers: e.headers,
				} satisfies UpstreamApiResponse;
			}
			throw e;
		}
		const { response, responseBody, responseHeaders } = result;
		return {
			body: responseBody,
			statusCode: response.status, // non 2xx will get thrown as 5xx errors
			headers: responseHeaders,
		} satisfies UpstreamApiResponse;
	};
}
