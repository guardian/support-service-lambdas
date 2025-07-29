import {
	zuoraSubscriptionResponseSchema,
	zuoraSubscriptionsFromAccountSchema,
} from '@modules/zuora/zuoraSchemas';
import subscriptionJson from './fixtures/subscription.json';
import subscriptionsFromAccountJson from './fixtures/subscriptions-from-account-number-response.json';

test('ChargedThroughDate is null in the model when it is null in Zuora', () => {
	const result = zuoraSubscriptionResponseSchema.parse(subscriptionJson);
	expect(result.ratePlans[0]?.ratePlanCharges[0]?.chargedThroughDate).toBe(
		null,
	);
});

test('ZuoraSubscriptionsFromAccountResponse schema is correct', () => {
	const result = zuoraSubscriptionsFromAccountSchema.parse(
		subscriptionsFromAccountJson,
	);
	expect(result.subscriptions).toBeDefined();
	expect(result.subscriptions?.length).toBe(1);
});
