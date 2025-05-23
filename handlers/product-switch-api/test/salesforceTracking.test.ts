import { createSQSMessageBody } from '../src/salesforceTracking';
import type { SwitchInformation } from '../src/switchInformation';

test('salesforce tracking data is serialised to the queue correctly', () => {
	const testData: SwitchInformation = {
		stage: 'CODE',
		input: {
			preview: false,
			// csrUserId: undefined,
			// caseId: undefined,
		},
		actualTotalPrice: 45.5,
		startNewTerm: false,
		contributionAmount: 10.5,
		account: {
			id: '',
			identityId: '',
			emailAddress: '',
			firstName: '',
			lastName: '',
			defaultPaymentMethodId: '',
		},
		subscription: {
			accountNumber: '',
			subscriptionNumber: 'A-S0123',
			previousProductName: 'Contributor',
			previousRatePlanName: 'Monthly Contribution',
			previousAmount: 20,
			currency: 'GBP',
			billingPeriod: 'Month',
		},
		catalog: {
			supporterPlus: {
				price: 0,
				productRatePlanId: '',
				subscriptionChargeId: '',
				contributionChargeId: '',
			},
			contribution: {
				productRatePlanId: '',
				chargeId: '',
			},
		},
	};
	const expected = {
		subscriptionName: 'A-S0123',
		previousAmount: 20,
		newAmount: 45.5,
		previousProductName: 'Contributor',
		previousRatePlanName: 'Monthly Contribution',
		newRatePlanName: 'Supporter Plus',
		requestedDate: '2025-05-12',
		effectiveDate: '2025-05-12',
		paidAmount: 15.81,
	};
	const MAY = 4;
	const actual = createSQSMessageBody(
		testData,
		15.81,
		new Date(2025, MAY, 12, 2, 2, 2, 2),
	);
	expect(JSON.parse(actual)).toEqual(expected);
});
