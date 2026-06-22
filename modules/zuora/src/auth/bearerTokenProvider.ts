import { logger } from '@modules/logger/logger';
import type { OAuthClientCredentials, ZuoraBearerToken } from '../types';
import { zuoraBearerTokenSchema } from '../types';
import { zuoraServerUrl } from '../utils';

export type Authorisation = {
	baseUrl: string;
	authHeaders: Record<string, string>;
};

export interface BearerTokenProvider {
	getAuthorisation(): Promise<Authorisation>;
}

export class ZuoraBearerTokenProvider implements BearerTokenProvider {
	private bearerToken: ZuoraBearerToken | null = null;
	private tokenExpiryTime: number | null = null;
	// 1 minute buffer in case of early expiry
	private bufferInMilliseconds = 60 * 1000;

	constructor(
		private stage: string,
		private credentials: OAuthClientCredentials,
	) {}

	private tokenIsExpired = () => {
		logger.log('Checking if Zuora bearer token is expired');
		if (this.tokenExpiryTime === null) {
			logger.log(
				'No token expiry time found, fetching a new Zuora bearer token',
			);
			return true;
		}
		const now = new Date();
		if (this.tokenExpiryTime < now.getTime() + this.bufferInMilliseconds) {
			logger.log('Zuora bearer token is expired', {
				tokenExpiryTime: this.tokenExpiryTime,
				now: now.getTime(),
			});
			return true;
		}
		logger.log('Zuora bearer token is still valid', {
			tokenExpiryTime: this.tokenExpiryTime,
			now: now.getTime(),
		});
		return false;
	};
	public async getBearerToken(): Promise<ZuoraBearerToken> {
		if (this.bearerToken === null || this.tokenIsExpired()) {
			this.bearerToken = await this.fetchZuoraBearerToken();
			this.tokenExpiryTime = Date.now() + this.bearerToken.expires_in * 1000;
		}
		return this.bearerToken;
	}

	private fetchZuoraBearerToken = async (): Promise<ZuoraBearerToken> => {
		logger.log(`fetching zuora bearer token for stage: ${this.stage}`);
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

		const parseResult = zuoraBearerTokenSchema.safeParse(json);
		logger.log('Zuora bearer token response:', json);
		if (!parseResult.success) {
			throw new Error(
				`Failed to fetch Zuora bearer token: ${JSON.stringify(parseResult.error.issues)}`,
			);
		}
		return parseResult.data;
	};

	public async getAuthorisation() {
		const bearerToken = await this.getBearerToken();
		return {
			baseUrl: zuoraServerUrl(this.stage),
			authHeaders: {
				Authorization: `Bearer ${bearerToken.access_token}`,
			},
		};
	}
}
