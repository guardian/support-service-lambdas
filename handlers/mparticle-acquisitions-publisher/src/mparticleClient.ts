import { logger } from '@modules/logger/logger';
import type { MParticleBatch } from './acquisitions';
import type { AppConfig } from './config';

export class MParticleClient {
	private constructor(
		private readonly endpoint: string,
		private readonly apiKey: string,
		private readonly apiSecret: string,
		private readonly fetchFn: typeof fetch,
	) {}

	static create(
		config: AppConfig['mparticle'],
		fetchFn: typeof fetch = fetch,
	): MParticleClient {
		return new MParticleClient(
			config.endpoint,
			config.apiKey,
			config.apiSecret,
			fetchFn,
		);
	}

	async sendEvents(batch: MParticleBatch): Promise<void> {
		logger.log('Sending mParticle Events API request', {
			endpoint: this.endpoint,
			eventCount: batch.events.length,
			sourceRequestId: batch.source_request_id,
		});

		let response: Response;
		try {
			response = await this.fetchFn(this.endpoint, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(batch),
			});
		} catch {
			logger.error('mParticle Events API request failed at the network layer', {
				endpoint: this.endpoint,
			});
			throw new Error('mParticle Events API network request failed');
		}

		logger.log('Received mParticle Events API response', {
			endpoint: this.endpoint,
			status: response.status,
		});

		if (!response.ok) {
			throw new Error(
				`mParticle Events API request failed with status ${response.status}`,
			);
		}
	}
}
