import { logger } from '@modules/logger/logger';
import type { Authorisation, BearerTokenProvider } from '@modules/zuora/auth';
import { RestClient } from '@modules/zuora/restClient';
import { brazeTrackPath, paymentFailureCommsExitEventName } from '../constants';
import { brazeTrackResponseSchema } from '../schemas/brazeTrackResponseSchema';
import type { BrazeTrackPayload } from '../types/braze';

class BrazeTokenProvider implements BearerTokenProvider {
	constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string,
	) {}

	getAuthorisation(): Promise<Authorisation> {
		return Promise.resolve({
			baseUrl: this.apiUrl,
			authHeaders: { Authorization: `Bearer ${this.apiKey}` },
		});
	}
}

export class BrazeClient extends RestClient {
	constructor(apiUrl: string, apiKey: string) {
		super(new BrazeTokenProvider(apiUrl, apiKey));
	}

	async sendCustomEvent(payload: BrazeTrackPayload): Promise<void> {
		logger.log(
			`Sending ${paymentFailureCommsExitEventName} custom event to Braze`,
		);

		const response = await this.post(
			brazeTrackPath,
			JSON.stringify(payload),
			brazeTrackResponseSchema,
		);

		if (response.errors && response.errors.length > 0) {
			throw new Error(
				`Braze ${brazeTrackPath} returned errors: ${JSON.stringify(response.errors)}`,
			);
		}
	}
}
