import {
	MParticleHttpClient,
	MParticleHttpError,
	MParticleNetworkError,
} from '@modules/mparticle/mparticleHttpClient';
import type { AppConfig } from './config';

export const MPARTICLE_EVENTS_ENDPOINT =
	'https://s2s.eu1.mparticle.com/v2/events';
const MPARTICLE_EVENTS_BASE_URL = MPARTICLE_EVENTS_ENDPOINT.replace(
	/\/events$/,
	'',
);

export type EventsApiRequest = Record<string, unknown>;

export class MParticleClient {
	private constructor(private readonly client: MParticleHttpClient) {}

	static create(
		config: AppConfig,
		fetchFn: typeof fetch = fetch,
	): MParticleClient {
		return new MParticleClient(
			new MParticleHttpClient(
				MPARTICLE_EVENTS_BASE_URL,
				config.apiKey,
				config.apiSecret,
				fetchFn,
			),
		);
	}

	async sendEvents(payload: EventsApiRequest): Promise<number> {
		let response;
		try {
			response = await this.client.post('/events', payload, () => undefined);
		} catch (error) {
			if (error instanceof MParticleNetworkError) {
				throw new Error('mParticle Events API network request failed');
			}

			if (error instanceof MParticleHttpError) {
				throw new Error(
					`mParticle Events API request failed with status ${error.statusCode}`,
				);
			}

			throw error;
		}

		if (!response.success) {
			throw response.error;
		}

		return response.statusCode;
	}
}
