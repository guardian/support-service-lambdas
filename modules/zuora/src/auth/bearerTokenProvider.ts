import { logger } from '@modules/logger/logger';
import type { OAuthClientCredentials } from '../types';
import { zuoraBearerTokenSchema } from '../types';
import { zuoraServerUrl } from '../utils';

export type Authorisation = {
	baseUrl: string;
	authHeaders: Record<string, string>;
};

export interface BearerTokenProvider {
	getAuthorisation(): Promise<Authorisation>;
}

type BearerToken = {
	bearerToken: string;
	tokenExpiryTime: number;
};

export class ZuoraBearerTokenProvider implements BearerTokenProvider {
	// 1 minute buffer in case of early expiry
	private readonly bufferInMilliseconds = 60 * 1000;
	private bearerToken: BearerToken | null = null;

	constructor(
		private stage: string,
		private credentials: OAuthClientCredentials,
	) {}

	private tokenIsExpired = () => {
		logger.log('Checking for valid Zuora bearer token');
		if (this.bearerToken === null) {
			logger.log(
				'No Zuora bearer token found, fetching a new Zuora bearer token',
			);
			return true;
		}
		const now = new Date();
		if (
			this.bearerToken.tokenExpiryTime <
			now.getTime() + this.bufferInMilliseconds
		) {
			logger.log('Zuora bearer token is expired', {
				tokenExpiryTime: this.bearerToken.tokenExpiryTime,
				now: now.getTime(),
			});
			return true;
		}
		logger.log('Zuora bearer token is still valid', {
			tokenExpiryTime: this.bearerToken.tokenExpiryTime,
			now: now.getTime(),
		});
		return false;
	};

	public async getBearerToken(): Promise<BearerToken> {
		if (this.bearerToken === null || this.tokenIsExpired()) {
			this.bearerToken = await this.fetchBearerToken();
		}
		return this.bearerToken;
	}

	private fetchBearerToken = async (): Promise<BearerToken> => {
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
		return {
			bearerToken: parseResult.data.access_token,
			tokenExpiryTime: Date.now() + parseResult.data.expires_in * 1000,
		};
	};

	public async getAuthorisation() {
		const bearerToken = await this.getBearerToken();
		return {
			baseUrl: zuoraServerUrl(this.stage),
			authHeaders: {
				Authorization: `Bearer ${bearerToken.bearerToken}`,
			},
		};
	}
}
