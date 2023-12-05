/**
 * @group integration
 */
import { DiscountApplicator } from '../src/discountApplicator';
import { ValidationError } from '../src/errors';

test('checkEligibility', async () => {
	const requestBody = {
		subscriptionNumber: 'A-S00744081',
		discountProductRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
	};

	const discountApplicator = await DiscountApplicator.create('CODE');
	try {
		await discountApplicator.checkEligibility(requestBody);
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log('Got the expected error');
		} else {
			fail("didn't recognise the error");
		}
	}
}, 30000);
