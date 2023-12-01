import { findDigisubProductRatePlan } from '../src/digitalSubscriptionSaveDiscounts';
import { zuoraSubscriptionSchema } from '../src/zuora/zuoraSchemas';
import digitalSubResponse from './fixtures/digital-subscriptions/annual-new-price.json';

test('findDigisubProductRatePlan', () => {
	const subscription = zuoraSubscriptionSchema.parse(digitalSubResponse);
	expect(
		findDigisubProductRatePlan('CODE', subscription)?.productRatePlanId,
	).toEqual('2c92c0f94bbffaaa014bc6a4212e205b');
});
