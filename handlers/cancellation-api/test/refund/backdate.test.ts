import dayjs from 'dayjs';
import { planBackdate } from '../../src/refund/backdate';

const unpaidPeriodStart = dayjs('2026-10-01');

describe('planBackdate', () => {
	it('backdates a cancellation after the unpaid period start', () => {
		expect(
			planBackdate({
				cancellationOrderExists: true,
				subscriptionStatus: 'Cancelled',
				cancellationDate: dayjs('2026-11-01'),
				unpaidPeriodStart,
			}),
		).toEqual({ action: 'deleteAndRecancel', backdated: true });
	});

	it.each(['2026-10-01', '2026-09-15'])(
		'never moves a cancellation on %s later',
		(cancellationDate) => {
			expect(
				planBackdate({
					cancellationOrderExists: true,
					subscriptionStatus: 'Cancelled',
					cancellationDate: dayjs(cancellationDate),
					unpaidPeriodStart,
				}),
			).toEqual({ action: 'none', backdated: false });
		},
	);

	it('re-cancels on a re-run after the order was deleted', () => {
		expect(
			planBackdate({
				cancellationOrderExists: false,
				subscriptionStatus: 'Active',
				cancellationDate: undefined,
				unpaidPeriodStart,
			}),
		).toEqual({ action: 'recancel', backdated: true });
	});

	it('does nothing on a re-run after backdating', () => {
		expect(
			planBackdate({
				cancellationOrderExists: false,
				subscriptionStatus: 'Cancelled',
				cancellationDate: unpaidPeriodStart,
				unpaidPeriodStart,
			}),
		).toEqual({ action: 'none', backdated: true });
	});

	it('throws if the order is gone and the subscription is cancelled on another date', () => {
		expect(() =>
			planBackdate({
				cancellationOrderExists: false,
				subscriptionStatus: 'Cancelled',
				cancellationDate: dayjs('2026-11-01'),
				unpaidPeriodStart,
			}),
		).toThrow('not the unpaid period start 2026-10-01');
	});

	it('throws if the order exists but the subscription is not cancelled', () => {
		expect(() =>
			planBackdate({
				cancellationOrderExists: true,
				subscriptionStatus: 'Active',
				cancellationDate: undefined,
				unpaidPeriodStart,
			}),
		).toThrow('Unexpected subscription status Active');
	});
});
