import { validatePromotion } from '../src/validatePromotion';
import { Promotion, AppliedPromotion } from '../src/schema';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';

const promotionName = 'Tiered Discount Weekend Home Delivery Extra';
const productRatePlanId = 'plan123';
const mockPromotion: Promotion = {
	name: promotionName,
	promotionType: { name: 'percent_discount', amount: 25, durationMonths: 3 },
	appliesTo: {
		productRatePlanIds: new Set([productRatePlanId]),
		countries: new Set(['GB']),
	},
	codes: { 'Channel 1': ['TEST123'] },
	starts: new Date('2024-09-25T23:00:00.000Z'),
	expires: new Date('2099-11-05T23:59:59.000Z'),
	landingPage: {
		title: 'Guardian and Observer newspaper subscriptions to suit every reader',
		description:
			'We offer a range of packages from every day to weekend, and different subscription types depending on whether you want to collect your newspaper in a shop or get it delivered.',
	},
};

const validAppliedPromotion: AppliedPromotion = {
	promoCode: 'TEST123',
	supportRegionId: SupportRegionId.UK,
};

const invalidAppliedPromotion: AppliedPromotion = {
	promoCode: 'TEST123',
	supportRegionId: SupportRegionId.EU,
};

describe('validatePromotion', () => {
	it('returns a ValidatedPromotion for valid promotion and country', () => {
		expect(
			validatePromotion(
				[mockPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toStrictEqual({
			discountPercentage: 25,
			durationInMonths: 3,
			promoCode: 'TEST123',
		});
	});

	it('throws an error for invalid productRatePlanId', () => {
		expect(() =>
			validatePromotion(
				[mockPromotion],
				validAppliedPromotion,
				'invalidProductRatePlanId',
			),
		).toThrow(
			`Promotion ${promotionName} is not valid for product rate plan invalidProductRatePlanId`,
		);
	});

	it('throws an error for invalid countryGroupId', () => {
		expect(() =>
			validatePromotion(
				[mockPromotion],
				invalidAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(`Promotion ${promotionName} is not valid for country group eu`);
	});

	it('throws an error if promotion code does not exist', () => {
		const unknownAppliedPromotion: AppliedPromotion = {
			promoCode: 'UNKNOWN',
			supportRegionId: SupportRegionId.UK,
		};
		expect(() =>
			validatePromotion(
				[mockPromotion],
				unknownAppliedPromotion,
				productRatePlanId,
			),
		).toThrow('No promotion found for code UNKNOWN');
	});
	it('throws an error if the promotion has not started yet', () => {
		const futureDate = '2099-09-25';
		const futurePromotion: Promotion = {
			...mockPromotion,
			starts: new Date(futureDate),
		};
		expect(() =>
			validatePromotion(
				[futurePromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`Promotion Tiered Discount Weekend Home Delivery Extra is not yet active, starts on ${futureDate}`,
		);
	});
	it('throws an error if the promotion has expired', () => {
		const pastDate = '2000-09-25';
		const expiredPromotion: Promotion = {
			...mockPromotion,
			expires: new Date(pastDate),
		};
		expect(() =>
			validatePromotion(
				[expiredPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`Promotion Tiered Discount Weekend Home Delivery Extra expired on ${pastDate}`,
		);
	});
	it('throws an error if the promotion is not a discount promotion', () => {
		const nonDiscountPromotion: Promotion = {
			...mockPromotion,
			promotionType: { name: 'tracking' },
		};
		expect(() =>
			validatePromotion(
				[nonDiscountPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`Tiered Discount Weekend Home Delivery Extra is a tracking promotion these are no longer supported`,
		);
	});
});
