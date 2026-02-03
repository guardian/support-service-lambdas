import { ValidationError } from '@modules/errors';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import zuoraCatalogFixture from '../../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import type { SwitchActionData } from '../../../src/changePlan/prepare/targetInformation';
import { annualContribHalfPriceSupporterPlusForOneYear } from '../../../src/changePlan/switchDefinition/discounts';
import { supporterPlusTargetInformation } from '../../../src/changePlan/switchDefinition/supporterPlusTargetInformation';

const productCatalog = generateProductCatalog(zuoraCatalogFixture);

const annualSupporterPlusRatePlan =
	productCatalog.SupporterPlus.ratePlans.Annual;
describe('getSupporterPlusTargetInformation', () => {
	test('returns target info with contribution when previous amount exceeds base price', async () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const previousAmount = basePrice + 50;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount,
			isGuardianEmail: false,
		};

		const result = await supporterPlusTargetInformation(
			annualSupporterPlusRatePlan,
			switchActionData,
		);

		expect(result.actualTotalPrice).toBe(previousAmount);
		expect(result.contributionCharge?.contributionAmount).toBe(50);
		expect(result.productRatePlanId).toBe(annualSupporterPlusRatePlan.id);
		expect(result.ratePlanName).toBe('Supporter Plus V2 - Annual');
		expect(result.discount).toBeUndefined();
	});

	test('puts people up onto the base price if they switch from below', async () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const previousAmount = basePrice - 50;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount,
			isGuardianEmail: false,
		};

		const result = await supporterPlusTargetInformation(
			annualSupporterPlusRatePlan,
			switchActionData,
		);

		expect(result.actualTotalPrice).toBe(basePrice);
		expect(result.contributionCharge?.contributionAmount).toBe(0);
	});

	test('uses user-requested amount when provided and valid', async () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const userRequestedAmount = basePrice + 100;

		const switchActionData: SwitchActionData = {
			mode: 'switchWithPriceOverride',
			currency: 'GBP',
			userRequestedAmount,
			isGuardianEmail: false,
		};

		const result = await supporterPlusTargetInformation(
			annualSupporterPlusRatePlan,
			switchActionData,
		);

		expect(result.actualTotalPrice).toBe(userRequestedAmount);
		expect(result.contributionCharge?.contributionAmount).toBe(100);
	});

	test('throws ValidationError when user-requested amount is below base price', () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const userRequestedAmount = basePrice - 10;

		const switchActionData: SwitchActionData = {
			mode: 'switchWithPriceOverride',
			currency: 'GBP',
			userRequestedAmount,
			isGuardianEmail: false,
		};

		expect(() =>
			supporterPlusTargetInformation(
				annualSupporterPlusRatePlan,
				switchActionData,
			),
		).toThrow(ValidationError);
	});

	test('applies discount when eligible for annual plan with low previous amount', async () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const discountedPrice = basePrice / 2;
		const previousAmount = discountedPrice - 10;

		const switchActionData: SwitchActionData = {
			mode: 'save',
			currency: 'GBP',
			previousAmount,
			isGuardianEmail: false,
		};

		const result = await supporterPlusTargetInformation(
			annualSupporterPlusRatePlan,
			switchActionData,
		);

		expect(result.discount).toBeDefined();
		expect(result.actualTotalPrice).toBe(discountedPrice);
		expect(result.contributionCharge?.contributionAmount).toBe(0);
		expect(result.discount?.discountPercentage).toBe(
			annualContribHalfPriceSupporterPlusForOneYear.discountPercentage,
		);
		expect(result.actualTotalPrice).toBe(discountedPrice);
		expect(result.contributionCharge?.contributionAmount).toBe(0);
	});

	test('does not apply discount when previous amount exceeds discounted price', () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const discountedPrice = basePrice / 2;
		const previousAmount = discountedPrice + 10;

		const switchActionData: SwitchActionData = {
			mode: 'save',
			currency: 'GBP',
			previousAmount,
			isGuardianEmail: false,
		};

		expect(() =>
			supporterPlusTargetInformation(
				annualSupporterPlusRatePlan,
				switchActionData,
			),
		).toThrow(ValidationError);
	});

	test('does not apply discount when not generally eligible', async () => {
		const basePrice = annualSupporterPlusRatePlan.pricing.GBP;
		const discountedPrice =
			(basePrice *
				(100 -
					annualContribHalfPriceSupporterPlusForOneYear.discountPercentage)) /
			100;
		const previousAmount = discountedPrice - 10;

		const switchActionData: SwitchActionData = {
			mode: 'switchToBasePrice',
			currency: 'GBP',
			previousAmount,
			isGuardianEmail: false,
		};

		const result = await supporterPlusTargetInformation(
			annualSupporterPlusRatePlan,
			switchActionData,
		);

		expect(result.discount).toBeUndefined();
		expect(result.actualTotalPrice).toBe(basePrice);
	});
});
