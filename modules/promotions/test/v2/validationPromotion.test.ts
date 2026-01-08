import { validatePromotion } from '@modules/promotions/v2/validatePromotion';
import { Promo } from '@modules/promotions/v2/schema';
import { SupportRegionId } from '@modules/internationalisation/countryGroup';

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

describe('validatePromotion v2', () => {
	it('returns a ValidatedPromotion for valid promotion and country', () => {
		expect(
			validatePromotion(testPromotion, SupportRegionId.UK, productRatePlanId),
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
				SupportRegionId.UK,
				'invalidProductRatePlanId',
			),
		).toThrow(
			`Promotion ${promotionName} is not valid for product rate plan invalidProductRatePlanId`,
		);
	});

	it('throws an error for invalid countryGroupId', () => {
		expect(() =>
			validatePromotion(testPromotion, SupportRegionId.EU, productRatePlanId),
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
				SupportRegionId.UK,
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
			validatePromotion(futurePromotion, SupportRegionId.UK, productRatePlanId),
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
			validatePromotion(
				expiredPromotion,
				SupportRegionId.UK,
				productRatePlanId,
			),
		).toThrow(`Promotion ${promotionName} expired on ${pastDate}`);
	});

	it('does not throw if endTimestamp is undefined', () => {
		const noEndPromotion: Promo = {
			...testPromotion,
			endTimestamp: undefined,
		};
		expect(() =>
			validatePromotion(noEndPromotion, SupportRegionId.UK, productRatePlanId),
		).not.toThrow();
	});
});
