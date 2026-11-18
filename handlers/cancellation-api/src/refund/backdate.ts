import type { Dayjs } from 'dayjs';

/**
 * After a Direct Debit fails, the subscription must be cancelled from the start of the unpaid period, so it is
 * credited in full. A cancellation that is already at or before then is left alone, so the date never moves later.
 * Backdating deletes the original cancellation order, so it no longer existing means a previous run backdated.
 */

export type BackdateAction = 'none' | 'recancel' | 'deleteAndRecancel';

export type BackdatePlan = {
	action: BackdateAction;
	backdated: boolean;
};

export function planBackdate({
	cancellationOrderExists,
	subscriptionStatus,
	cancellationDate,
	unpaidPeriodStart,
}: {
	cancellationOrderExists: boolean;
	subscriptionStatus: string;
	cancellationDate: Dayjs | undefined;
	unpaidPeriodStart: Dayjs;
}): BackdatePlan {
	if (subscriptionStatus === 'Active' && !cancellationOrderExists) {
		// a previous run deleted the order but did not re-cancel
		return { action: 'recancel', backdated: true };
	}
	if (subscriptionStatus !== 'Cancelled' || cancellationDate === undefined) {
		throw new Error(
			`Unexpected subscription status ${subscriptionStatus} with cancellation order ${cancellationOrderExists ? 'present' : 'deleted'}`,
		);
	}
	if (cancellationOrderExists) {
		return cancellationDate.isAfter(unpaidPeriodStart, 'day')
			? { action: 'deleteAndRecancel', backdated: true }
			: { action: 'none', backdated: false };
	}
	if (cancellationDate.isSame(unpaidPeriodStart, 'day')) {
		return { action: 'none', backdated: true };
	}
	throw new Error(
		`Cancellation order is deleted but the subscription is cancelled on ${cancellationDate.format('YYYY-MM-DD')}, not the unpaid period start ${unpaidPeriodStart.format('YYYY-MM-DD')}`,
	);
}
