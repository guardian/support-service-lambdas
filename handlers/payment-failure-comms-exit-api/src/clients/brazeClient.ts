import { logger } from '@modules/logger/logger';
import {
	brazeRequestTimeoutMillis,
	brazeTrackPath,
	paymentFailureCommsExitEventName,
} from '../constants';
import { parseBrazeTrackResponse } from '../helpers/parseBrazeTrackResponse';
import type { BrazeTrackPayload } from '../types';

export class BrazeClient {
	constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string,
		private readonly fetchFn: typeof fetch = fetch,
	) {}

	async sendCustomEvent(payload: BrazeTrackPayload): Promise<void> {
		logger.log(
			`Sending ${paymentFailureCommsExitEventName} custom event to Braze`,
		);

		const response = await this.fetchFn(`${this.apiUrl}${brazeTrackPath}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(brazeRequestTimeoutMillis),
		});

		const parsedResponse = parseBrazeTrackResponse(await response.text());

		logger.log(
			`Received Braze ${brazeTrackPath} response with status ${response.status}`,
		);

		if (!response.ok) {
			throw new Error(
				`Braze ${brazeTrackPath} failed with status ${response.status}: ${JSON.stringify(parsedResponse.errors ?? parsedResponse.message ?? {})}`,
			);
		}

		if (parsedResponse.errors && parsedResponse.errors.length > 0) {
			throw new Error(
				`Braze ${brazeTrackPath} returned errors: ${JSON.stringify(parsedResponse.errors)}`,
			);
		}
	}
}
