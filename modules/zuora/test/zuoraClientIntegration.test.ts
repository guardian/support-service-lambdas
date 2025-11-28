/**
 * Integration test for the ZuoraClient class.
 *
 * @group integration
 */

import type { ZuoraSubscription } from '@modules/zuora/types';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

test('ZuoraClient', async () => {
	const stage = 'CODE';
	const subscriptionNumber = 'A-S00737600';
	const zuoraClient = await ZuoraClient.create(stage);
	const path = `v1/subscriptions/${subscriptionNumber}`;
	const subscription: ZuoraSubscription = await zuoraClient.get(
		path,
		zuoraSubscriptionSchema,
	);
	expect(subscription.subscriptionNumber).toBe(subscriptionNumber);
});
