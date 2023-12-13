/**
 * Integration test for the ZuoraClient class.
 *
 * @group integration
 */

import { BearerTokenProvider } from '../../src/zuora/bearerTokenProvider';
import { getOAuthClientCredentials } from '../../src/zuora/oAuthCredentials';
import { ZuoraClient } from '../../src/zuora/zuoraClient';
import type { ZuoraSubscription } from '../../src/zuora/zuoraSchemas';
import { zuoraSubscriptionSchema } from '../../src/zuora/zuoraSchemas';

test('ZuoraClient', async () => {
	const stage = 'CODE';
	const subscriptionNumber = 'A-S00737600';
	const credentials = await getOAuthClientCredentials(stage);
	const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
	const zuoraClient = new ZuoraClient(stage, bearerTokenProvider);
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const subscription = await zuoraClient.get<ZuoraSubscription>(
		path,
		zuoraSubscriptionSchema,
	);
	expect(subscription.subscriptionNumber).toBe(subscriptionNumber);
});
