import {
	zuoraSubscriptionSchema,
	zuoraSubscriptionsFromAccountSchema,
} from '@modules/zuora/types';
import subscriptionJson from './fixtures/subscription.json';
import subscriptionsFromAccountJson from './fixtures/subscriptions-from-account-number-response.json';
import subWithDiscountJson from './fixtures/subWithDiscount.json';

test('ChargedThroughDate is null in the model when it is null in Zuora', () => {
	const result = zuoraSubscriptionSchema.parse(subscriptionJson);
	expect(result.ratePlans[0]?.ratePlanCharges[0]?.chargedThroughDate).toBe(
		null,
	);
});

test('both discounts and normal charges can be read', () => {
	const result = zuoraSubscriptionSchema.parse(subWithDiscountJson);
	expect(result.ratePlans[0]?.ratePlanCharges[0]?.model).toBe(
		'DiscountPercentage',
	);
});

test('ZuoraSubscriptionsFromAccountResponse schema is correct', () => {
	const result = zuoraSubscriptionsFromAccountSchema.parse(
		subscriptionsFromAccountJson,
	);
	expect(result.subscriptions).toBeDefined();
	expect(result.subscriptions?.length).toBe(1);
});
