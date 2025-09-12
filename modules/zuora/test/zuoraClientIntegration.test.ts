/**
 * Integration test for the ZuoraClient class.
 *
 * @group integration
 */

import { Logger } from '@modules/routing/logger';
import {
	getOAuthClientCredentials,
	BearerTokenProvider,
} from '@modules/zuora/auth';
import type { ZuoraSubscription } from '@modules/zuora/types';
import { zuoraSubscriptionResponseSchema } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

test('ZuoraClient', async () => {
	const stage = 'CODE';
	const subscriptionNumber = 'A-S00737600';
	const credentials = await getOAuthClientCredentials(stage);
	const bearerTokenProvider = new BearerTokenProvider(stage, credentials);
	const zuoraClient = new ZuoraClient(stage, bearerTokenProvider, new Logger());
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const subscription: ZuoraSubscription = await zuoraClient.get(
		path,
		zuoraSubscriptionResponseSchema,
	);
	expect(subscription.subscriptionNumber).toBe(subscriptionNumber);
});
