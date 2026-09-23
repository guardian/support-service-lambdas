import { logger } from '@modules/logger/logger';
import {
	MParticleHttpClient,
	MParticleHttpError,
	type MParticleHttpResponse,
	MParticleNetworkError,
} from '@modules/mparticle/mparticleHttpClient';
import type { MParticleBatch } from './acquisitions';
import type { AppConfig } from './config';

export class MParticleClient {
	private constructor(
		private readonly endpoint: string,
		private readonly client: MParticleHttpClient,
	) {}

	static create(
		config: AppConfig['mparticle'],
		fetchFn: typeof fetch = fetch,
	): MParticleClient {
		return new MParticleClient(
			config.endpoint,
			new MParticleHttpClient(
				config.endpoint,
				config.apiKey,
				config.apiSecret,
				fetchFn,
			),
		);
	}

	async sendEvents(batch: MParticleBatch): Promise<void> {
		logger.log('Sending mParticle Events API request', {
			endpoint: this.endpoint,
			eventCount: batch.events.length,
			sourceRequestId: batch.source_request_id,
		});

		let response: MParticleHttpResponse<undefined>;
		try {
			response = await this.client.post('', batch, () => undefined);
		} catch (error) {
			if (error instanceof MParticleNetworkError) {
				logger.error(
					'mParticle Events API request failed at the network layer',
					{ endpoint: this.endpoint },
				);
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

		logger.log('Received mParticle Events API response', {
			endpoint: this.endpoint,
			status: response.statusCode,
		});
	}
}
