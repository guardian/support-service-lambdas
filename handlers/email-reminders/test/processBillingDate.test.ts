import { logger } from '@modules/logger/logger';
import { processBatch } from '../src/processor/processBatch';
import type { ReminderSubscription } from '../src/processor/processBillingDate';
import {
	chargeNotBillingMessage,
	outcomeMessage,
	processBillingDate,
} from '../src/processor/processBillingDate';

const charge = (number: string, name: string, chargedThroughDate: string) => ({
	id: number,
	productRatePlanChargeId: 'prpc',
	number,
	name,
	type: 'Recurring',
	model: 'FlatFee',
	currency: 'GBP',
	effectiveStartDate: new Date('2026-06-09'),
	effectiveEndDate: new Date('2027-06-09'),
	billingPeriod: 'Month' as const,
	processedThroughDate: new Date('2026-11-09'),
	chargedThroughDate: new Date(chargedThroughDate),
	upToPeriodsType: null,
	upToPeriods: null,
	price: 10,
	discountPercentage: null,
	billingPeriodAlignment: null,
});

const subscription = {
	subscriptionNumber: 'A-S00123456',
	status: 'Active',
	autoRenew: true,
	contractEffectiveDate: new Date('2026-06-09'),
	termEndDate: new Date('2027-06-09'),
	ratePlans: [
		{
			productName: 'Supporter Plus',
			ratePlanCharges: [
				charge('C-00000002', 'Subscription', '2026-12-09'),
				charge('C-00000001', 'Contribution', '2026-12-09'),
			],
		},
	],
} as unknown as ReminderSubscription;

const message = (chargeNumber: string) => ({
	subscriptionNumber: 'A-S00123456',
	accountNumber: 'A00123456',
	chargeNumber,
	billingDate: '2026-12-09',
});

describe('processBillingDate', () => {
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it('logs the notice that would be sent for the first charge', () => {
		processBillingDate(subscription, message('C-00000001'));

		expect(logSpy).toHaveBeenCalledWith(
			outcomeMessage,
			expect.objectContaining({
				productKeys: ['SupporterPlus'],
				eligible: true,
				wouldSend: 'renewalReminder',
			}),
		);
	});

	it('ignores callouts for other charges', () => {
		processBillingDate(subscription, message('C-00000002'));

		expect(logSpy).not.toHaveBeenCalledWith(outcomeMessage, expect.anything());
		expect(errorSpy).not.toHaveBeenCalled();
	});

	it('reports when the callout charge no longer bills on the date', () => {
		processBillingDate(subscription, message('C-00000003'));

		expect(errorSpy).toHaveBeenCalledWith(
			chargeNotBillingMessage,
			expect.anything(),
		);
	});
});

describe('processBatch', () => {
	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	const batchMessage = (messageId: string, subscriptionNumber: string) => ({
		messageId,
		message: { ...message('C-00000001'), subscriptionNumber },
	});

	it('fetches each subscription once and only fails the messages for a failed fetch', async () => {
		const getSubscription = jest.fn((subscriptionNumber: string) =>
			subscriptionNumber === 'A-S00000002'
				? Promise.reject(new Error('zuora error'))
				: Promise.resolve(subscription),
		);

		const failed = await processBatch({ getSubscription }, [
			batchMessage('m1', 'A-S00000001'),
			batchMessage('m2', 'A-S00000002'),
			batchMessage('m3', 'A-S00000001'),
			batchMessage('m4', 'A-S00000002'),
		]);

		expect(getSubscription.mock.calls).toEqual([
			['A-S00000001'],
			['A-S00000002'],
		]);
		expect(failed).toEqual(['m2', 'm4']);
	});
});
