import {
	createEventsApiClient,
	type EventsAPI,
	type MParticleClient,
	MParticleHttpError,
	MParticleNetworkError,
} from '@modules/mparticle/mparticleHttpClient';
import type { AppConfig } from './config';

const MPARTICLE_EVENTS_POD = 'eu1';
const MPARTICLE_EVENTS_PATH = '/events';

export type EventsApiRequest = Record<string, unknown>;
export type EventsApiClient = MParticleClient<EventsAPI>;

export const createMParticleClient = (config: AppConfig): EventsApiClient =>
	createEventsApiClient(
		{ key: config.apiKey, secret: config.apiSecret },
		MPARTICLE_EVENTS_POD,
	);

export const sendEvents = async (
	client: EventsApiClient,
	payload: EventsApiRequest,
): Promise<void> => {
	let response;
	try {
		response = await client.post(MPARTICLE_EVENTS_PATH, payload);
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
};
