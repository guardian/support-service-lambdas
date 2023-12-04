import { DiscountApplicator } from '../src/discountApplicator';

test('checkEligibility', async () => {
	const requestBody = {
		subscriptionNumber: 'A-S00744081',
		discountProductRatePlanId: '2c92c0f84bbfec8b014bc655f4852d9d',
	};

	const discountApplicator = await DiscountApplicator.create('CODE');
	await discountApplicator.checkEligibility(requestBody);
});
