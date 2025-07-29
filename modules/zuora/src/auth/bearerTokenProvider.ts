import { zuoraBearerTokenSchema } from '../types/auth/auth';
import type {
	OAuthClientCredentials,
	ZuoraBearerToken,
} from '../types/auth/auth';
import { zuoraServerUrl } from '../utils/common';

export class BearerTokenProvider {
	private bearerToken: ZuoraBearerToken | null = null;
	private lastFetchedTime: Date | null = null;

	constructor(
		private stage: string,
		private credentials: OAuthClientCredentials,
	) {}

	private tokenIsExpired = () => {
		if (this.bearerToken === null) {
			return true;
		}
		const now = new Date();
		return (
			this.lastFetchedTime === null ||
			this.lastFetchedTime.getTime() + this.bearerToken.expires_in * 1000 <
				now.getTime()
		);
	};
	public async getBearerToken(): Promise<ZuoraBearerToken> {
		if (this.bearerToken === null || this.tokenIsExpired()) {
			this.lastFetchedTime = new Date();
			this.bearerToken = await this.fetchZuoraBearerToken();
		}
		return this.bearerToken;
	}

	private fetchZuoraBearerToken = async (): Promise<ZuoraBearerToken> => {
		console.log(`fetching zuora bearer token for stage: ${this.stage}`);
		const url = `${zuoraServerUrl(this.stage)}/oauth/token`;

		// Use URLSearchParams to encode the body of the request
		// https://jakearchibald.com/2021/encoding-data-for-post-requests/
		const formData = new URLSearchParams([
			['client_id', this.credentials.clientId],
			['client_secret', this.credentials.clientSecret],
			['grant_type', 'client_credentials'],
		]);

		const response = await fetch(url, {
			method: 'POST',
			body: formData,
		});

		const json = await response.json();

		return zuoraBearerTokenSchema.parse(json);
	};
}
