import { findDigisubProductRatePlan } from '../src/digitalSubSaveDiscounts';
import { zuoraSubscriptionSchema } from '../src/zuora/zuoraSchemas';
import digitalSubResponse from './fixtures/digitalSub-response.json';

test('findDigisubProductRatePlan', () => {
	const subscription = zuoraSubscriptionSchema.parse(digitalSubResponse);
	expect(
		findDigisubProductRatePlan('CODE', subscription)?.productRatePlanId,
	).toEqual('2c92c0f94bbffaaa014bc6a4212e205b');
});
