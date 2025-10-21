import { validatePromotion } from '../src/validatePromotion';
import { Promotion, AppliedPromotion } from '../src/schema';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';

const promotionName = 'Test Promotion';
const productRatePlanId = '12345';
const promoCode = 'TEST123';
const testPromotion: Promotion = {
	name: promotionName,
	promotionType: { name: 'percent_discount', amount: 25, durationMonths: 3 },
	appliesTo: {
		productRatePlanIds: new Set([productRatePlanId]),
		countries: new Set(['GB']),
	},
	codes: { 'Channel 1': [promoCode] },
	starts: new Date('2024-09-25T23:00:00.000Z'),
	expires: new Date('2099-11-05T23:59:59.000Z'),
};

const validAppliedPromotion: AppliedPromotion = {
	promoCode: promoCode,
	supportRegionId: SupportRegionId.UK,
};

const invalidAppliedPromotion: AppliedPromotion = {
	promoCode: promoCode,
	supportRegionId: SupportRegionId.EU,
};

describe('validatePromotion', () => {
	it('returns a ValidatedPromotion for valid promotion and country', () => {
		expect(
			validatePromotion(
				[testPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toStrictEqual({
			discountPercentage: 25,
			durationInMonths: 3,
			promoCode: promoCode,
		});
	});

	it('throws an error for invalid productRatePlanId', () => {
		expect(() =>
			validatePromotion(
				[testPromotion],
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
				[testPromotion],
				invalidAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`Promotion ${promotionName} is not valid for country group Europe`,
		);
	});

	it('throws an error if promotion code does not exist', () => {
		const unknownAppliedPromotion: AppliedPromotion = {
			promoCode: 'UNKNOWN',
			supportRegionId: SupportRegionId.UK,
		};
		expect(() =>
			validatePromotion(
				[testPromotion],
				unknownAppliedPromotion,
				productRatePlanId,
			),
		).toThrow('No promotion found for code UNKNOWN');
	});
	it('throws an error if the discount does not have a duration', () => {
		const perpetualDiscountPromotion: Promotion = {
			...testPromotion,
			promotionType: { name: 'percent_discount', amount: 25 },
		};
		expect(() =>
			validatePromotion(
				[perpetualDiscountPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`Promotion percent_discount is missing durationMonths. Perpetual discounts are not allowed`,
		);
	});
	it('throws an error if the promotion has not started yet', () => {
		const futureDate = '2099-09-25';
		const futurePromotion: Promotion = {
			...testPromotion,
			starts: new Date(futureDate),
		};
		expect(() =>
			validatePromotion(
				[futurePromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`Promotion ${promotionName} is not yet active, starts on ${futureDate}`,
		);
	});
	it('throws an error if the promotion has expired', () => {
		const pastDate = '2000-09-25';
		const expiredPromotion: Promotion = {
			...testPromotion,
			expires: new Date(pastDate),
		};
		expect(() =>
			validatePromotion(
				[expiredPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(`Promotion ${promotionName} expired on ${pastDate}`);
	});
	it('throws an error if the promotion is not a discount promotion', () => {
		const nonDiscountPromotion: Promotion = {
			...testPromotion,
			promotionType: { name: 'tracking' },
		};
		expect(() =>
			validatePromotion(
				[nonDiscountPromotion],
				validAppliedPromotion,
				productRatePlanId,
			),
		).toThrow(
			`${promoCode} is a tracking promotion these are no longer supported`,
		);
	});
});
