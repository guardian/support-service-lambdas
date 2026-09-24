import type { AppConfig } from './config';

export const MPARTICLE_EVENTS_ENDPOINT =
	'https://s2s.eu1.mparticle.com/v2/events';

export type EventsApiRequest = Record<string, unknown>;

export class MParticleClient {
	private constructor(
		private readonly apiKey: string,
		private readonly apiSecret: string,
		private readonly fetchFn: typeof fetch,
	) {}

	static create(
		config: AppConfig,
		fetchFn: typeof fetch = fetch,
	): MParticleClient {
		return new MParticleClient(config.apiKey, config.apiSecret, fetchFn);
	}

	async sendEvents(payload: EventsApiRequest): Promise<number> {
		let response: Response;
		try {
			response = await this.fetchFn(MPARTICLE_EVENTS_ENDPOINT, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
		} catch {
			throw new Error('mParticle Events API network request failed');
		}

		if (!response.ok) {
			throw new Error(
				`mParticle Events API request failed with status ${response.status}`,
			);
		}

		return response.status;
	}
}
