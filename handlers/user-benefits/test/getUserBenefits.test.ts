import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import { zuoraDateFormat } from '@modules/zuora/common';
import dayjs from 'dayjs';
import codeZuoraCatalog from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import {
	digitalSubscriptionBenefits,
	supporterPlusBenefits,
	tierThreeBenefits,
} from '../src/productBenefit';
import { getBenefits } from '../src/userBenefits';

const commonSupporterRatePlanItem = {
	subscriptionName: 'AS-12345',
	identityId: '1111111',
	termEndDate: zuoraDateFormat(dayjs().add(1, 'month')),
	contractEffectiveDate: zuoraDateFormat(dayjs().add(-1, 'month')),
};

test('getUserBenefits', () => {
	const productCatalog = generateProductCatalog(codeZuoraCatalog);
	const productCatalogHelper = new ProductCatalogHelper(productCatalog);

	const itemsWithDigitalSub = [
		{
			...commonSupporterRatePlanItem,
			productRatePlanId:
				productCatalog.DigitalSubscription.ratePlans.Monthly.id,
			productRatePlanName: 'Digital Subscription Monthly',
		},
	];
	expect(getBenefits(productCatalogHelper, itemsWithDigitalSub)).toEqual(
		digitalSubscriptionBenefits,
	);

	const itemsWithGuardianLight = [
		{
			...commonSupporterRatePlanItem,
			productRatePlanId: productCatalog.GuardianLight.ratePlans.Monthly.id,
			productRatePlanName: 'Guardian Light Monthly',
		},
	];
	expect(getBenefits(productCatalogHelper, itemsWithGuardianLight)).toEqual([
		'rejectTracking',
	]);

	const itemsWithSupporterPlus = [
		{
			...commonSupporterRatePlanItem,
			productRatePlanId: productCatalog.SupporterPlus.ratePlans.Monthly.id,
			productRatePlanName: 'Supporter Plus Monthly',
		},
	];
	expect(getBenefits(productCatalogHelper, itemsWithSupporterPlus)).toEqual(
		supporterPlusBenefits,
	);

	const itemsWithTierThree = [
		{
			...commonSupporterRatePlanItem,
			productRatePlanId: productCatalog.TierThree.ratePlans.DomesticAnnualV2.id,
			productRatePlanName: 'Tier Three Monthly',
		},
	];
	expect(getBenefits(productCatalogHelper, itemsWithTierThree)).toEqual(
		tierThreeBenefits,
	);

	const itemsWithGuardianWeekly = [
		{
			...commonSupporterRatePlanItem,
			productRatePlanId:
				productCatalog.GuardianWeeklyDomestic.ratePlans.Monthly.id,
			productRatePlanName: 'Guardian Weekly Domestic Monthly',
		},
	];
	expect(getBenefits(productCatalogHelper, itemsWithGuardianWeekly)).toEqual([
		'fewerSupportAsks',
	]);

	expect(getBenefits(productCatalogHelper, undefined)).toEqual([]);
});
