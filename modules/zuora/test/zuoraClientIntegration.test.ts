/**
 * Integration test for the ZuoraClient class.
 *
 * @group integration
 */

import { BearerTokenProvider } from '../src/bearerTokenProvider';
import { getOAuthClientCredentials } from '../src/oAuthCredentials';
import { ZuoraClient } from '../src/zuoraClient';
import type { ZuoraSubscription } from '../src/zuoraSchemas';
import { zuoraSubscriptionSchema } from '../src/zuoraSchemas';

test('ZuoraClient', async () => {
	const stage = 'CODE';
	const subscriptionNumber = 'A-S00737600';
	const credentials = await getOAuthClientCredentials(stage);
	const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
	const zuoraClient = new ZuoraClient(stage, bearerTokenProvider);
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const subscription: ZuoraSubscription = await zuoraClient.get(
		path,
		zuoraSubscriptionSchema,
	);
	expect(subscription.subscriptionNumber).toBe(subscriptionNumber);
});
