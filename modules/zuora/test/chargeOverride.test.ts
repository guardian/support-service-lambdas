import prod from '../../zuora-catalog/test/fixtures/catalog-prod.json';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { getChargeOverride } from '@modules/zuora/createSubscription/chargeOverride';
import { deliveryContact } from './fixtures/createSubscriptionFixtures';
import { ProductPurchase } from '@modules/product-catalog/productPurchaseSchema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';

describe('getChargeOverride', () => {
	const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(prod));
	const chargeOverrideShouldBeUndefinedForProduct = (
		productPurchase: ProductPurchase,
	) => {
		expect(
			getChargeOverride(productCatalog, productPurchase, 'GBP'),
		).toBeUndefined();
	};

	test('should return the correct charge override for a Contribution', () => {
		expect(
			getChargeOverride(
				productCatalog,
				{
					product: 'Contribution',
					ratePlan: 'Annual',
					amount: 150,
				},
				'GBP',
			),
		).toEqual({
			productRatePlanChargeId: '2c92a0fc5e1dc084015e37f58c7b0f34',
			overrideAmount: 150,
		});

		expect(
			getChargeOverride(
				productCatalog,
				{
					product: 'Contribution',
					ratePlan: 'Monthly',
					amount: 15,
				},
				'GBP',
			),
		).toEqual({
			productRatePlanChargeId: '2c92a0fc5aacfadd015ad250bf2c6d38',
			overrideAmount: 15,
		});
	});
	test(
		'should return a charge override for SupporterPlus rate plans ' +
			'which have a contribution charge when the amount is greater than the base price',
		() => {
			expect(
				getChargeOverride(
					productCatalog,
					{
						product: 'SupporterPlus',
						ratePlan: 'Monthly',
						amount: 15,
					},
					'GBP',
				),
			).toEqual({
				productRatePlanChargeId: '8a128d7085fc6dec01860234cd075270',
				overrideAmount: 3,
			});

			expect(
				getChargeOverride(
					productCatalog,
					{
						product: 'SupporterPlus',
						ratePlan: 'Annual',
						amount: 150,
					},
					'GBP',
				),
			).toEqual({
				productRatePlanChargeId: '8a12892d85fc6df4018602451322287f',
				overrideAmount: 30,
			});
		},
	);
	test('should throw an error if the SupporterPlus contribution amount is negative', () => {
		expect(() =>
			getChargeOverride(
				productCatalog,
				{
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 10,
				},
				'GBP',
			),
		).toThrow(
			'The contribution amount of a supporter plus subscription cannot be less than zero, but here it would be -2',
		);

		expect(() =>
			getChargeOverride(
				productCatalog,
				{
					product: 'SupporterPlus',
					ratePlan: 'Annual',
					amount: 110,
				},
				'GBP',
			),
		).toThrow(
			'The contribution amount of a supporter plus subscription cannot be less than zero, but here it would be -10',
		);
	});
	test('should not return a charge override for SupporterPlus rate plans which do not have a contribution charge', () => {
		chargeOverrideShouldBeUndefinedForProduct({
			product: 'SupporterPlus',
			ratePlan: 'OneYearStudent',
			amount: 150,
		});
	});
	test('should not return a charge override for products which do not have an amount in the product information', () => {
		chargeOverrideShouldBeUndefinedForProduct({
			product: 'NewspaperVoucher',
			ratePlan: 'EverydayPlus',
			firstDeliveryDate: new Date('2024-06-20'),
			deliveryContact: deliveryContact,
		});
		chargeOverrideShouldBeUndefinedForProduct({
			product: 'GuardianWeeklyRestOfWorld',
			ratePlan: 'Annual',
			firstDeliveryDate: new Date('2024-06-20'),
			deliveryContact: deliveryContact,
		});
		chargeOverrideShouldBeUndefinedForProduct({
			product: 'TierThree',
			ratePlan: 'DomesticAnnual',
			firstDeliveryDate: new Date('2024-06-20'),
			deliveryContact: deliveryContact,
		});
		chargeOverrideShouldBeUndefinedForProduct({
			product: 'GuardianAdLite',
			ratePlan: 'Monthly',
		});
		chargeOverrideShouldBeUndefinedForProduct({
			product: 'DigitalSubscription',
			ratePlan: 'Monthly',
		});
	});
});
