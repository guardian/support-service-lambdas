import { z } from 'zod';
import { logger } from '@modules/logger/logger';

export type BrazeTrackPayload = {
	events: Array<{
		external_id: string;
		app_id: string;
		name: 'pf_csr_exit';
		time: string;
		_update_existing_only: true;
	}>;
};

const brazeTrackResponseSchema = z
	.object({
		message: z.string().optional(),
		errors: z.array(z.string()).optional(),
	})
	.passthrough();

const requestTimeoutMillis = 10_000;

export class BrazeClient {
	constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string,
		private readonly fetchFn: typeof fetch = fetch,
	) {}

	async sendCustomEvent(payload: BrazeTrackPayload): Promise<void> {
		logger.log('Sending pf_csr_exit custom event to Braze');

		const response = await this.fetchFn(`${this.apiUrl}/users/track`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(requestTimeoutMillis),
		});

		const responseText = await response.text();
		const parsedResponse = parseBrazeTrackResponse(responseText);

		logger.log(
			`Received Braze /users/track response with status ${response.status}`,
		);

		if (!response.ok) {
			throw new Error(
				`Braze /users/track failed with status ${response.status}: ${JSON.stringify(parsedResponse.errors ?? parsedResponse.message ?? {})}`,
			);
		}

		if (parsedResponse.errors && parsedResponse.errors.length > 0) {
			throw new Error(
				`Braze /users/track returned errors: ${JSON.stringify(parsedResponse.errors)}`,
			);
		}
	}
}

function parseBrazeTrackResponse(responseText: string) {
	try {
		return brazeTrackResponseSchema.parse(
			responseText === '' ? {} : JSON.parse(responseText),
		);
	} catch (error) {
		throw new Error(
			`Invalid response from Braze /users/track: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
