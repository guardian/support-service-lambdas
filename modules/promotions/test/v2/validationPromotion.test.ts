import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import type { AppliedPromotion, Promo } from '@modules/promotions/v2/schema';
import { validatePromotion } from '@modules/promotions/v2/validatePromotion';

const promotionName = 'Test Promotion';
const productRatePlanId = '12345';
const promoCode = 'TEST123';

const testPromotion: Promo = {
	name: promotionName,
	promoCode: promoCode,
	campaignCode: 'campaign',
	startTimestamp: '2024-09-25T23:00:00.000Z',
	endTimestamp: '2099-11-05T23:59:59.000Z',
	discount: {
		amount: 25,
		durationMonths: 3,
	},
	appliesTo: {
		countries: ['GB'],
		productRatePlanIds: [productRatePlanId],
	},
};

const appliedPromotion: AppliedPromotion = {
	promoCode,
	supportRegionId: SupportRegionId.UK,
};

describe('validatePromotion v2', () => {
	it('throws an error if the promotion is undefined', () => {
	  expect(() =>
	    validatePromotion(undefined, appliedPromotion, productRatePlanId),
	  ).toThrow(`No Promotion found for promo code ${appliedPromotion.promoCode}`);
	});

	it('returns a ValidatedPromotion for valid promotion and country', () => {
		expect(
			validatePromotion(testPromotion, appliedPromotion, productRatePlanId),
		).toStrictEqual({
			discountPercentage: 25,
			durationInMonths: 3,
			promoCode: promoCode,
		});
	});

	it('throws an error for invalid productRatePlanId', () => {
		expect(() =>
			validatePromotion(
				testPromotion,
				appliedPromotion,
				'invalidProductRatePlanId',
			),
		).toThrow(
			`Promotion ${promotionName} is not valid for product rate plan invalidProductRatePlanId`,
		);
	});

	it('throws an error for invalid countryGroupId', () => {
		expect(() =>
			validatePromotion(
				testPromotion,
				{ promoCode, supportRegionId: SupportRegionId.EU },
				productRatePlanId,
			),
		).toThrow(
			`Promotion ${promotionName} is not valid for country group Europe`,
		);
	});

	it('throws an error if the discount is missing', () => {
		const noDiscountPromotion: Promo = {
			...testPromotion,
			discount: undefined,
		};
		expect(() =>
			validatePromotion(
				noDiscountPromotion,
				appliedPromotion,
				productRatePlanId,
			),
		).toThrow(`Promotion ${promoCode} is missing discount`);
	});

	it('throws an error if the promotion has not started yet', () => {
		const futureDate = '2099-09-25T00:00:00.000Z';
		const futurePromotion: Promo = {
			...testPromotion,
			startTimestamp: futureDate,
		};
		expect(() =>
			validatePromotion(futurePromotion, appliedPromotion, productRatePlanId),
		).toThrow(
			`Promotion ${promotionName} is not yet active, starts on ${futureDate}`,
		);
	});

	it('throws an error if the promotion has expired', () => {
		const pastDate = '2000-09-25T00:00:00.000Z';
		const expiredPromotion: Promo = {
			...testPromotion,
			endTimestamp: pastDate,
		};
		expect(() =>
			validatePromotion(expiredPromotion, appliedPromotion, productRatePlanId),
		).toThrow(`Promotion ${promotionName} expired on ${pastDate}`);
	});

	it('does not throw if endTimestamp is undefined', () => {
		const noEndPromotion: Promo = {
			...testPromotion,
			endTimestamp: undefined,
		};
		expect(() =>
			validatePromotion(noEndPromotion, appliedPromotion, productRatePlanId),
		).not.toThrow();
	});
});
