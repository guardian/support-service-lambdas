import dayjs from 'dayjs';
import {
	isRefundExpected,
	previewResponseFromZuoraResponse,
} from '../../../src/changePlan/action/preview';
import type { TargetInformation } from '../../../src/changePlan/prepare/targetInformation';
import type { ZuoraPreviewResponse } from '../../../src/doPreviewInvoices';

test('preview amounts are correct', () => {
	const apiResponse: ZuoraPreviewResponse = {
		previewResult: {
			invoices: [
				{
					amount: 63.2,
					invoiceItems: [
						{
							serviceEndDate: '2025-03-20',
							amount: 95.0,
							productRatePlanChargeId: '8ad08e1a858672180185880566606fad',
							unitPrice: 95.0,
						},
						{
							serviceEndDate: '2025-03-20',
							amount: 0.0,
							productRatePlanChargeId: '8ad096ca858682bb0185881568385d73',
							unitPrice: 0.0,
						},
						{
							serviceEndDate: '2024-09-30',
							amount: -31.8,
							productRatePlanChargeId: '2c92c0f85e2d19af015e3896e84d092e',
							unitPrice: 60.0,
						},
					],
				},
			],
		},
	};

	const expectedOutput = {
		amountPayableToday: 63.2,
		proratedRefundAmount: 31.8,
		targetCatalogPrice: 95.0,
		nextPaymentDate: '2025-03-21',
	};

	const targetInformation: Pick<
		TargetInformation,
		'subscriptionChargeId' | 'contributionCharge' | 'discount'
	> = {
		subscriptionChargeId: '8ad08e1a858672180185880566606fad',
		contributionCharge: {
			contributionAmount: 1,
			id: '8ad096ca858682bb0185881568385d73',
		},
		discount: undefined,
	};

	expect(
		previewResponseFromZuoraResponse(
			'CODE',
			apiResponse,
			targetInformation as TargetInformation,
			['2c92c0f85e2d19af015e3896e84d092e'],
			dayjs('2024-07-06'),
		),
	).toStrictEqual(expectedOutput);
});

/*
This tests a scenario that occurs when the product switch occurs on the day that the payments would renew.
 In this scenario there is nothing to refund, so the Invoice Item will not be created.
 In such a situation, no error should be thrown and the refund amount returned output should be 0.
 */
test('dont expect a refund if switching on the charged through date', () => {
	const currentDate = dayjs('2025-01-01');

	expect(isRefundExpected(currentDate, currentDate)).toBe(false);
});

test('expect a refund if switching before the charged through date', () => {
	const currentDate = dayjs('2025-01-01');
	const chargedThroughDate = currentDate.add(1, 'day');

	expect(isRefundExpected(chargedThroughDate, currentDate)).toBe(true);
});
