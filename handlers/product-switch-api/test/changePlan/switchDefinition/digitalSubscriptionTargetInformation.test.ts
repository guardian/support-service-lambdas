import { ValidationError } from '@modules/errors';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { SwitchActionData } from '../../../src/changePlan/prepare/targetInformation';
import { digitalSubscriptionTargetInformation } from '../../../src/changePlan/switchDefinition/digitalSubscriptionTargetInformation';

const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(zuoraCatalogFixture),
);

const annualDigitalSubscriptionRatePlan =
	productCatalog.DigitalSubscription.ratePlans.Annual;

describe('digitalSubscriptionTargetInformation', () => {
	test("returns target info when amount doesn't inclide a contribution", async () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: catalogPrice,
			includesContribution: false,
			isGuardianEmail: true,
		};

		const result =
			await digitalSubscriptionTargetInformation.fromUserInformation(
				annualDigitalSubscriptionRatePlan,
				switchActionData,
			);

		expect(result.actualTotalPrice).toBe(catalogPrice);
		expect(result.productRatePlanId).toBe(annualDigitalSubscriptionRatePlan.id);
		expect(result.ratePlanName).toBe('Digital Pack Annual');
		expect(result.contributionCharge).toBeUndefined();
		expect(result.discount).toBeUndefined();

		const nonGuardianSwitchActionData: SwitchActionData = {
			...switchActionData,
			isGuardianEmail: false,
		};

		expect(() =>
			digitalSubscriptionTargetInformation.fromUserInformation(
				annualDigitalSubscriptionRatePlan,
				nonGuardianSwitchActionData,
			),
		).toThrow(ValidationError);
	});

	test('throws ValidationError when previous amount does include a contribution', () => {
		const catalogPrice = annualDigitalSubscriptionRatePlan.pricing.GBP;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount: catalogPrice + 5,
			includesContribution: true,
			isGuardianEmail: true,
		};

		expect(() =>
			digitalSubscriptionTargetInformation.fromUserInformation(
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
			includesContribution: false,
			isGuardianEmail: true,
		};

		const result =
			await digitalSubscriptionTargetInformation.fromUserInformation(
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
			includesContribution: false,
			isGuardianEmail: true,
		};

		expect(() =>
			digitalSubscriptionTargetInformation.fromUserInformation(
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
			isGuardianEmail: true,
		};

		expect(() =>
			digitalSubscriptionTargetInformation.fromUserInformation(
				annualDigitalSubscriptionRatePlan,
				switchActionData,
			),
		).toThrow(ValidationError);
	});
});
