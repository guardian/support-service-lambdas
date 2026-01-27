import { ValidationError } from '@modules/errors';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { SwitchActionData } from '../../../src/changePlan/prepare/targetInformation';
import { digitalSubscriptionTargetInformation } from '../../../src/changePlan/switchDefinition/digitalSubscriptionTargetInformation';

const productCatalog = generateProductCatalog(zuoraCatalogFixture);

const annualDigitalSubscriptionRatePlan =
	productCatalog.DigitalSubscription.ratePlans.Annual;

describe('digitalSubscriptionTargetInformation', () => {
	test('returns target info when amount matches catalog price', async () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: catalogPrice,
		};

		const result = await digitalSubscriptionTargetInformation(
			annualDigitalSubscriptionRatePlan,
			switchActionData,
		);

		expect(result.actualTotalPrice).toBe(catalogPrice);
		expect(result.productRatePlanId).toBe(annualDigitalSubscriptionRatePlan.id);
		expect(result.ratePlanName).toBe('Digital Pack Annual');
		expect(result.contributionCharge).toBeUndefined();
		expect(result.discount).toBeUndefined();
	});

	test('throws ValidationError when user-requested amount does not match catalog price', () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: catalogPrice + 5,
		};

		expect(() =>
			digitalSubscriptionTargetInformation(
				annualDigitalSubscriptionRatePlan,
				switchActionData,
			),
		).toThrow(ValidationError);
	});

	test('accepts user-requested amount when it matches catalog price', async () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: catalogPrice,
		};

		const result = await digitalSubscriptionTargetInformation(
			annualDigitalSubscriptionRatePlan,
			switchActionData,
		);

		expect(result.actualTotalPrice).toBe(catalogPrice);
	});

	test('throws ValidationError in save mode', () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'save',
			currency: 'GBP',
			previousAmount: catalogPrice,
		};

		expect(() =>
			digitalSubscriptionTargetInformation(
				annualDigitalSubscriptionRatePlan,
				switchActionData,
			),
		).toThrow(ValidationError);
	});

	test('throws ValidationError in switchWithPriceOverride mode', () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'switchWithPriceOverride',
			currency: 'GBP',
			userRequestedAmount: catalogPrice,
		};

		expect(() =>
			digitalSubscriptionTargetInformation(
				annualDigitalSubscriptionRatePlan,
				switchActionData,
			),
		).toThrow(ValidationError);
	});
});
