import dayjs from 'dayjs';
import type { Promo } from '@modules/promotions/v2/schema';
import { isActivePromo } from '../../src/v2/isActivePromo';

const buildPromo = (startTimestamp: string, endTimestamp?: string): Promo => ({
	name: 'Test Promotion',
	promoCode: 'TEST123',
	campaignCode: 'campaign',
	startTimestamp,
	endTimestamp,
	discount: undefined,
	description: undefined,
	landingPage: undefined,
	appliesTo: {
		productRatePlanIds: [],
		countries: ['GB'],
	},
});

describe('isActivePromo', () => {
	const now = dayjs('2025-06-15T00:00:00.000Z');

	it('returns true when the promo has started and has no end date', () => {
		const promo = buildPromo('2025-01-01T00:00:00.000Z');
		expect(isActivePromo(promo, now)).toBe(true);
	});

	it('returns true when the promo has started and has not yet ended', () => {
		const promo = buildPromo(
			'2025-01-01T00:00:00.000Z',
			'2025-12-31T00:00:00.000Z',
		);
		expect(isActivePromo(promo, now)).toBe(true);
	});

	it('returns false when the promo has not started yet', () => {
		const promo = buildPromo('2025-12-01T00:00:00.000Z');
		expect(isActivePromo(promo, now)).toBe(false);
	});

	it('returns false when the promo has already ended', () => {
		const promo = buildPromo(
			'2025-01-01T00:00:00.000Z',
			'2025-06-01T00:00:00.000Z',
		);
		expect(isActivePromo(promo, now)).toBe(false);
	});

	it('returns false when the promo ends exactly now', () => {
		const promo = buildPromo('2025-01-01T00:00:00.000Z', now.toISOString());
		expect(isActivePromo(promo, now)).toBe(false);
	});

	it('defaults to the current time when now is not provided', () => {
		const pastPromo = buildPromo('2000-01-01T00:00:00.000Z');
		expect(isActivePromo(pastPromo)).toBe(true);

		const futurePromo = buildPromo('2999-01-01T00:00:00.000Z');
		expect(isActivePromo(futurePromo)).toBe(false);
	});
});
