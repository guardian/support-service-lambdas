import dayjs, { type Dayjs } from 'dayjs';
import type { Promo } from './schema';

/**
 * A promotion is active if it has started and, if it has an end date, has not yet ended.
 */
export const isActivePromo = (promo: Promo, now: Dayjs = dayjs()): boolean => {
	const startDate = dayjs(promo.startTimestamp);
	const endDate = promo.endTimestamp ? dayjs(promo.endTimestamp) : undefined;

	const hasStarted = startDate.isBefore(now) || startDate.isSame(now);
	const hasNotEnded = endDate === undefined || now.isBefore(endDate);
	
	return hasStarted && hasNotEnded;
};
