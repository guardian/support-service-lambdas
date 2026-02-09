import { DataExtensionNames } from '@modules/email/email';
import type { SubscriptionInformation } from '../src/changePlan/prepare/subscriptionInformation';
import type { TargetInformation } from '../src/changePlan/prepare/targetInformation';
import { createSQSMessageBody } from '../src/salesforceTracking';

test('salesforce tracking data is serialised to the queue correctly', () => {
	const targetInformation: TargetInformation = {
		dataExtensionName:
			DataExtensionNames.recurringContributionToSupporterPlusSwitch,
		actualTotalPrice: 45.5,
		contributionCharge: {
			id: '',
			contributionAmount: 10.5,
		},
		productRatePlanId: '',
		ratePlanName: 'Supporter Plus',
		subscriptionChargeId: '',
	};
	const subscriptionInformation: SubscriptionInformation = {
		accountNumber: '',
		chargeIds: [''],
		chargedThroughDate: undefined,
		previousAmount: 20,
		previousProductName: 'Contributor',
		previousRatePlanName: 'Monthly Contribution',
		productRatePlanId: '',
		productRatePlanKey: 'Monthly',
		subscriptionNumber: 'A-S0123',
		termStartDate: new Date(),
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
		caseId: 'caseid1234',
		csrUserId: 'csruser1234',
	};
	const MAY = 4;
	const actual = createSQSMessageBody(
		targetInformation,
		subscriptionInformation,
		{ caseId: 'caseid1234', csrUserId: 'csruser1234' },
		15.81,
		new Date(2025, MAY, 12, 2, 2, 2, 2),
	);
	expect(JSON.parse(actual)).toEqual(expected);
});
