import type { BearerTokenProvider } from './bearerTokenProvider';
import { zuoraServerUrl } from './common';
import type { ZuoraSubscription } from './zuoraSchemas';
import { zuoraSubscriptionSchema } from './zuoraSchemas';

export class GetSubscription {
	constructor(
		private stage: string,
		private tokenProvider: BearerTokenProvider,
	) {}
	public async getSubscription(
		subscriptionNumber: string,
	): Promise<ZuoraSubscription> {
		const url = `${zuoraServerUrl(
			this.stage,
		)}/v1/subscriptions/${subscriptionNumber}`;
		const bearerToken = await this.tokenProvider.getBearerToken();
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${bearerToken.access_token}`,
			},
		});
		const json = await response.json();
		console.log('Response from Zuora was: ', json);
		return zuoraSubscriptionSchema.parse(json);
	}
}
