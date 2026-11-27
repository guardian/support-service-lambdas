import { logger } from '@modules/logger/logger';
import type { ReminderSubscription } from '../src/processor/processBillingDate';
import {
	chargeNotBillingMessage,
	outcomeMessage,
	processBillingDate,
} from '../src/processor/processBillingDate';
import { processorInputSchema } from '../src/stepData';

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

const message = (billingDate: string) =>
	processorInputSchema.parse({
		subscriptionNumber: 'A-S00123456',
		accountNumber: 'A00123456',
		billingDate,
	});

describe('processBillingDate', () => {
	let logSpy: jest.SpyInstance;
	let errorSpy: jest.SpyInstance;

	beforeEach(() => {
		logSpy = jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => jest.restoreAllMocks());

	it('logs the notice that would be sent', () => {
		processBillingDate(subscription, message('2026-12-09'));

		expect(logSpy).toHaveBeenCalledWith(
			outcomeMessage,
			expect.objectContaining({
				productKeys: ['SupporterPlus'],
				eligible: true,
				wouldSend: 'renewalReminder',
			}),
		);
	});

	it('reports when no charge bills on the date any more', () => {
		processBillingDate(subscription, message('2026-12-10'));

		expect(errorSpy).toHaveBeenCalledWith(
			chargeNotBillingMessage,
			expect.anything(),
		);
		expect(logSpy).not.toHaveBeenCalledWith(outcomeMessage, expect.anything());
	});
});
