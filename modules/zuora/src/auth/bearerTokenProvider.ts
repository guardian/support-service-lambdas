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
	private lastFetchedTime: Date | null = null;

	constructor(
		private stage: string,
		private credentials: OAuthClientCredentials,
	) {}

	private tokenIsExpired = () => {
		logger.log('Checking if Zuora bearer token is expired');
		if (this.bearerToken === null) {
			logger.log('No Zuora bearer token found, fetching a new one');
			return true;
		}
		const now = new Date();
		if (this.lastFetchedTime === null) {
			logger.log(
				'No last fetched time found, fetching a new Zuora bearer token',
			);
			return true;
		}
		if (
			this.lastFetchedTime.getTime() + this.bearerToken.expires_in * 1000 <
			now.getTime()
		) {
			logger.log('Zuora bearer token is expired', {
				lastFetchedTime: this.lastFetchedTime.getTime(),
				expiresIn: this.bearerToken.expires_in * 1000,
				now: now.getTime(),
			});
			return true;
		}
		logger.log('Zuora bearer token is still valid');
		return false;
	};
	public async getBearerToken(): Promise<ZuoraBearerToken> {
		if (this.bearerToken === null || this.tokenIsExpired()) {
			this.lastFetchedTime = new Date();
			this.bearerToken = await this.fetchZuoraBearerToken();
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
