import { validatePromotion } from '../src/validatePromotion';
import { Promotion, AppliedPromotion } from '../src/schema';

const productRatePlanId = 'plan123';
const mockPromotion: Promotion = {
	name: 'Tiered Discount Weekend Home Delivery Extra',
	description:
		'Guardian and Observer newspaper subscriptions to suit every reader',
	promotionType: { name: 'percent_discount', amount: 23.51, durationMonths: 3 },
	appliesTo: {
		productRatePlanIds: new Set([productRatePlanId]),
		countries: new Set(['JE', 'GI', 'IM', 'GB', 'SH', 'GG', 'FK']),
	},
	campaignCode: 'C_L6KVUF94',
	codes: { 'Channel 1': ['TEST123'] },
	starts: new Date('2024-09-25T23:00:00.000Z'),
	expires: new Date('2024-11-05T23:59:59.000Z'),
	landingPage: {
		title: 'Guardian and Observer newspaper subscriptions to suit every reader',
		description:
			'We offer a range of packages from every day to weekend, and different subscription types depending on whether you want to collect your newspaper in a shop or get it delivered.',
	},
};

const validAppliedPromotion: AppliedPromotion = {
	promoCode: 'TEST123',
	countryGroupId: 'uk',
};

const invalidAppliedPromotion: AppliedPromotion = {
	promoCode: 'TEST123',
	countryGroupId: 'eu',
};

describe('appliedPromotionIsValid', () => {
	it('returns true for valid promotion and country', () => {
		expect(
			validatePromotion(
				[mockPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toBe(true);
	});

	it('returns false for invalid productRatePlanId', () => {
		expect(
			validatePromotion([mockPromotion], validAppliedPromotion, 'planX'),
		).toBe(false);
	});

	it('returns false for invalid countryGroupId', () => {
		expect(
			validatePromotion([mockPromotion], invalidAppliedPromotion, 'planA'),
		).toBe(false);
	});

	it('returns false if promotion code does not exist', () => {
		const unknownAppliedPromotion: AppliedPromotion = {
			promoCode: 'UNKNOWN',
			countryGroupId: 'uk',
		};
		expect(
			validatePromotion([mockPromotion], unknownAppliedPromotion, 'planA'),
		).toBe(false);
	});
});
