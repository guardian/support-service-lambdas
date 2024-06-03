import { zuoraSubscriptionSchema } from '@modules/zuora/zuoraSchemas';
import subscriptionJson from './fixtures/subscription.json';

test('ChargedThroughDate is null in the model when it is null in Zuora', async () => {
	const result = zuoraSubscriptionSchema.parse(subscriptionJson);
	expect(result.ratePlans[0]?.ratePlanCharges[0]?.chargedThroughDate).toBe(
		null,
	);
});
