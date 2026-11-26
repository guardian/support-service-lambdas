import type {
	ClassifiableCharge,
	ClassifiableSubscription,
} from '../src/processor/classifyNotice';
import { classifyNotice } from '../src/processor/classifyNotice';

const date = (iso: string) => new Date(`${iso}T00:00:00Z`);

const recurring = (
	billingPeriod: string,
	startDate: string,
): ClassifiableCharge => ({
	type: 'Recurring',
	model: 'FlatFee',
	billingPeriod,
	effectiveStartDate: date(startDate),
	upToPeriods: null,
	upToPeriodsType: null,
});

const discount = (
	billingPeriod: string,
	startDate: string,
	upToPeriods: number,
	upToPeriodsType: string,
): ClassifiableCharge => ({
	type: 'Recurring',
	model: 'DiscountPercentage',
	billingPeriod,
	effectiveStartDate: date(startDate),
	upToPeriods,
	upToPeriodsType,
});

const subscription = (
	billingPeriod: string,
	startDate: string,
	discountCharge?: ClassifiableCharge,
): ClassifiableSubscription => ({
	contractEffectiveDate: date(startDate),
	ratePlans: [
		{
			productName: 'Supporter Plus',
			ratePlanCharges: [recurring(billingPeriod, startDate)],
		},
		...(discountCharge
			? [{ productName: 'Discounts', ratePlanCharges: [discountCharge] }]
			: []),
	],
});

const noticeFor = (sub: ClassifiableSubscription, billingDate: string) => {
	const result = classifyNotice(sub, billingDate);
	if (result.status !== 'classified') {
		throw new Error(result.reason);
	}
	return result;
};

describe('classifyNotice', () => {
	it('ignores credits under the Discounts product', () => {
		const sub = subscription('Month', '2026-06-01');
		sub.ratePlans.push({
			productName: 'Discounts',
			ratePlanCharges: [recurring('Month', '2026-08-01')],
		});

		expect(noticeFor(sub, '2026-12-01').notice).toBe('renewalReminder');
	});

	it('ends a discount on the last day of a shorter month, as Zuora does', () => {
		const sub = subscription(
			'Month',
			'2026-01-31',
			discount('Month', '2026-01-31', 1, 'Months'),
		);

		expect(noticeFor(sub, '2026-02-28').notice).toBe('endOfOffer');
	});

	it('treats discounts under the legacy Promotions product as discounts', () => {
		const sub: ClassifiableSubscription = {
			contractEffectiveDate: date('2026-06-10'),
			ratePlans: [
				{
					productName: 'Promotions',
					ratePlanCharges: [discount('Month', '2026-06-10', 3, 'Months')],
				},
				{
					productName: 'Digital Pack',
					ratePlanCharges: [recurring('Month', '2026-06-10')],
				},
			],
		};

		const result = noticeFor(sub, '2026-09-10');

		expect(result.productName).toBe('Digital Pack');
		expect(result.notice).toBe('endOfOffer');
	});

	it('sends a renewal reminder six months after a monthly subscription starts', () => {
		const sub = subscription('Month', '2026-06-01');

		expect(noticeFor(sub, '2026-11-01').notice).toBe('none');
		expect(noticeFor(sub, '2026-12-01').notice).toBe('renewalReminder');
		expect(noticeFor(sub, '2027-01-01').notice).toBe('none');
		expect(noticeFor(sub, '2027-06-01').notice).toBe('renewalReminder');
	});

	it('sends a renewal reminder every second quarterly payment', () => {
		const sub = subscription('Quarter', '2026-01-10');

		expect(noticeFor(sub, '2026-04-10').notice).toBe('none');
		expect(noticeFor(sub, '2026-07-10').notice).toBe('renewalReminder');
		expect(noticeFor(sub, '2026-10-10').notice).toBe('none');
	});

	it('sends a renewal reminder every annual renewal', () => {
		const sub = subscription('Annual', '2026-02-28');

		expect(noticeFor(sub, '2027-02-28').notice).toBe('renewalReminder');
		expect(noticeFor(sub, '2028-02-28').notice).toBe('renewalReminder');
	});

	it('sends only an end-of-offer notice when a monthly discount ends on a reminder date', () => {
		const sub = subscription(
			'Month',
			'2026-06-01',
			discount('Month', '2026-06-01', 6, 'Months'),
		);

		const atOfferEnd = noticeFor(sub, '2026-12-01');
		expect(atOfferEnd.notice).toBe('endOfOffer');
		expect(atOfferEnd.discountEndDates).toEqual(['2026-12-01']);
		expect(noticeFor(sub, '2027-06-01').notice).toBe('renewalReminder');
	});

	it('sends an end-of-offer notice at the first annual renewal after a discount', () => {
		const sub = subscription(
			'Annual',
			'2026-01-15',
			discount('Annual', '2026-01-15', 1, 'Years'),
		);

		expect(noticeFor(sub, '2027-01-15').notice).toBe('endOfOffer');
		expect(noticeFor(sub, '2028-01-15').notice).toBe('renewalReminder');
	});

	it('works out discount ends given in billing periods', () => {
		const sub = subscription(
			'Quarter',
			'2026-01-01',
			discount('Quarter', '2026-01-01', 2, 'Billing_Periods'),
		);

		expect(noticeFor(sub, '2026-07-01').notice).toBe('endOfOffer');
	});

	it('logs the alternative anchoring to the end of the offer', () => {
		const sub = subscription(
			'Quarter',
			'2026-01-01',
			discount('Quarter', '2026-01-01', 3, 'Months'),
		);

		expect(noticeFor(sub, '2026-04-01').notice).toBe('endOfOffer');
		const secondRenewal = noticeFor(sub, '2026-07-01');
		expect(secondRenewal.notice).toBe('renewalReminder');
		expect(secondRenewal.renewalReminderAnchoredToOfferEnd).toBe(false);
		const thirdRenewal = noticeFor(sub, '2026-10-01');
		expect(thirdRenewal.notice).toBe('none');
		expect(thirdRenewal.renewalReminderAnchoredToOfferEnd).toBe(true);
	});

	it('ignores removed rate plans', () => {
		const sub = subscription('Month', '2026-06-01');
		sub.ratePlans.push({
			productName: 'Digital Pack',
			lastChangeType: 'Remove',
			ratePlanCharges: [recurring('Annual', '2025-06-01')],
		});

		expect(noticeFor(sub, '2026-12-01').notice).toBe('renewalReminder');
	});

	it('does not classify subscriptions it does not understand', () => {
		const twoProducts = subscription('Month', '2026-06-01');
		twoProducts.ratePlans.push({
			productName: 'Digital Pack',
			ratePlanCharges: [recurring('Month', '2026-06-01')],
		});

		expect(classifyNotice(twoProducts, '2026-12-01').status).toBe(
			'unsupported',
		);
		expect(
			classifyNotice(subscription('Semi_Annual', '2026-06-01'), '2026-12-01')
				.status,
		).toBe('unsupported');
	});
});
