import { logger } from '@modules/logger/logger';
import { z } from 'zod';

export type BrazeTrackPayload = {
	attributes?: Array<
		{
			external_id: string;
			_update_existing_only: true;
		} & Record<string, unknown>
	>;
	events?: Array<{
		external_id: string;
		name: string;
		time: string;
		_update_existing_only: true;
		properties?: Record<string, unknown>;
	}>;
};

const brazeTrackResponseSchema = z
	.object({
		message: z.string().optional(),
		errors: z.array(z.string()).optional(),
	})
	.passthrough();

type BrazeTrackResponse = z.infer<typeof brazeTrackResponseSchema>;

function parseJsonResponse(responseText: string): unknown {
	return JSON.parse(responseText);
}

export class BrazeClient {
	constructor(
		private readonly apiUrl: string,
		private readonly apiKey: string,
		private readonly fetchFn: typeof fetch = fetch,
	) {}

	async updateUserAttributes(payload: BrazeTrackPayload): Promise<void> {
		logger.log(
			`Sending Braze /users/track request: ${JSON.stringify(payload)}`,
		);

		const response = await this.fetchFn(`${this.apiUrl}/users/track`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});

		const responseText = await response.text();
		logger.log(
			`Received Braze /users/track response (${response.status}): ${responseText}`,
		);

		let parsedBody: BrazeTrackResponse;
		try {
			const body: unknown =
				responseText === '' ? {} : parseJsonResponse(responseText);
			parsedBody = brazeTrackResponseSchema.parse(body);
		} catch (error) {
			throw new Error(
				`Invalid response from Braze /users/track: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		if (!response.ok) {
			throw new Error(
				`Braze /users/track failed with status ${response.status}: ${JSON.stringify(parsedBody.errors ?? parsedBody.message ?? {})}`,
			);
		}

		if (parsedBody.errors && parsedBody.errors.length > 0) {
			throw new Error(
				`Braze /users/track returned errors: ${JSON.stringify(parsedBody.errors)}`,
			);
		}
	}
}
