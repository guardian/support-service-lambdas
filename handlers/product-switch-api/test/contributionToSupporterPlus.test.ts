/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 */
import type { EmailMessageWithUserId } from '@modules/email/email';
import { ValidationError } from '@modules/errors';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { ProductCatalog } from '@modules/product-catalog/productCatalog';
import {
	zuoraAccountSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { previewResponseFromZuoraResponse } from '../src/contributionToSupporterPlus';
import { buildEmailMessage } from '../src/productSwitchEmail';
import type { ProductSwitchRequestBody } from '../src/schemas';
import { productSwitchRequestSchema } from '../src/schemas';
import {
	getFirstContributionRatePlan,
	getSwitchInformationWithOwnerCheck,
	subscriptionHasAlreadySwitchedToSupporterPlus,
} from '../src/switchInformation';
import { parseUrlPath } from '../src/urlParsing';
import accountJson from './fixtures/account.json';
import alreadySwitchedJson from './fixtures/already-switched-subscription.json';
import jsonWithNoContribution from './fixtures/subscription-with-no-contribution.json';
import subscriptionJson from './fixtures/subscription.json';

export const getProductCatalogFromFixture = (): ProductCatalog =>
	generateProductCatalog(zuoraCatalogFixture);

test('request body serialisation', () => {
	const result: ProductSwitchRequestBody = productSwitchRequestSchema.parse({
		price: 10,
		preview: false,
	});
	expect(result.price).toEqual(10);
});

test('url parsing', () => {
	const successfulParsing = parseUrlPath(
		'/product-move/recurring-contribution-to-supporter-plus/A-S00504165',
	);
	expect(successfulParsing.switchType).toEqual(
		'recurring-contribution-to-supporter-plus',
	);
	expect(successfulParsing.subscriptionNumber).toEqual('A-S00504165');

	const incorrectSwitchType =
		'/product-move/membership-to-digital-subscription/A-S00504165';
	expect(() => {
		parseUrlPath(incorrectSwitchType);
	}).toThrow(
		"Couldn't parse switch type and subscription number from url /product-move/membership-to-digital-subscription/A-S00504165",
	);

	const invalidSubscriptionNumber =
		'/product-move/recurring-contribution-to-supporter-plus/A00000';
	expect(() => {
		parseUrlPath(invalidSubscriptionNumber);
	}).toThrow(
		"Couldn't parse switch type and subscription number from url /product-move/recurring-contribution-to-supporter-plus/A00000",
	);

	const missingPathPrefix =
		'/recurring-contribution-to-supporter-plus/A-S00504165';
	expect(() => {
		parseUrlPath(missingPathPrefix);
	}).toThrow(
		"Couldn't parse switch type and subscription number from url /recurring-contribution-to-supporter-plus/A-S00504165",
	);
});

test('startNewTerm is only true when the termStartDate is before today', () => {
	const today = dayjs('2024-05-09T23:10:10.663+01:00');
	const subscription = zuoraSubscriptionSchema.parse(subscriptionJson);
	const account = zuoraAccountSchema.parse(accountJson);
	const productCatalog = getProductCatalogFromFixture();

	const switchInformation = getSwitchInformationWithOwnerCheck(
		'CODE',
		{ price: 95, preview: false },
		subscription,
		account,
		productCatalog,
		'999999999999',
		today,
	);
	expect(switchInformation.startNewTerm).toEqual(false);
});

test('preview amounts are correct', () => {
	const apiResponse = {
		success: true,
		previewResult: {
			invoices: [
				{
					amount: 63.2,
					amountWithoutTax: 63.2,
					taxAmount: 0.0,
					targetDate: '2024-03-21',
					invoiceItems: [
						{
							serviceStartDate: '2024-03-21',
							serviceEndDate: '2025-03-20',
							amountWithoutTax: 95.0,
							taxAmount: 0.0,
							chargeName: 'Subscription',
							processingType: 'Charge',
							productName: 'Supporter Plus',
							productRatePlanChargeId: '8ad08e1a858672180185880566606fad',
							unitPrice: 95.0,
							subscriptionNumber: 'A-S00504165',
							additionalInfo: {
								quantity: 1,
								unitOfMeasure: '',
								numberOfDeliveries: 0.0,
							},
						},
						{
							serviceStartDate: '2024-03-21',
							serviceEndDate: '2025-03-20',
							amountWithoutTax: 0.0,
							taxAmount: 0.0,
							chargeDescription: '',
							chargeName: 'Contribution',
							chargeNumber: null,
							processingType: 'Charge',
							productName: 'Supporter Plus',
							productRatePlanChargeId: '8ad096ca858682bb0185881568385d73',
							unitPrice: 0.0,
							subscriptionNumber: 'A-S00504165',
							orderLineItemNumber: null,
							additionalInfo: {
								quantity: 1,
								unitOfMeasure: '',
								numberOfDeliveries: 0.0,
							},
						},
						{
							serviceStartDate: '2024-03-21',
							serviceEndDate: '2024-09-30',
							amountWithoutTax: -31.8,
							taxAmount: 0.0,
							chargeDescription: '',
							chargeName: 'Contribution',
							chargeNumber: 'C-00839692',
							processingType: 'Charge',
							productName: 'Contributor',
							productRatePlanChargeId: '2c92c0f85e2d19af015e3896e84d092e',
							unitPrice: 60.0,
							subscriptionNumber: 'A-S00504165',
							orderLineItemNumber: null,
							additionalInfo: {
								quantity: 1,
								unitOfMeasure: '',
								numberOfDeliveries: 0.0,
							},
						},
					],
				},
			],
		},
	};

	const expectedOutput = {
		amountPayableToday: 63.2,
		contributionRefundAmount: -31.8,
		supporterPlusPurchaseAmount: 95.0,
		nextPaymentDate: '2025-03-21',
	};

	expect(
		previewResponseFromZuoraResponse(apiResponse, {
			supporterPlus: {
				price: 95,
				productRatePlanId: 'not_used',
				subscriptionChargeId: '8ad08e1a858672180185880566606fad',
				contributionChargeId: '8ad096ca858682bb0185881568385d73',
			},
			contribution: {
				productRatePlanId: 'not_used',
				chargeId: '2c92c0f85e2d19af015e3896e84d092e',
			},
		}),
	).toStrictEqual(expectedOutput);
});

test('Email message body is correct', () => {
	const emailAddress = 'test@thegulocal.com';
	const dateOfFirstPayment = dayjs('2024-04-16');
	const emailMessage: EmailMessageWithUserId = buildEmailMessage({
		dateOfFirstPayment: dateOfFirstPayment,
		emailAddress: emailAddress,
		firstName: 'test',
		lastName: 'user',
		currency: 'GBP',
		productPrice: 10,
		firstPaymentAmount: 5.6,
		billingPeriod: 'Month',
		subscriptionNumber: 'A-S123456',
		identityId: '123456789',
	});

	const expectedOutput = {
		To: {
			Address: 'test@thegulocal.com',
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: 'test',
					last_name: 'user',
					currency: '£',
					price: '10.00',
					first_payment_amount: '5.60',
					date_of_first_payment: '16 April 2024',
					payment_frequency: 'Monthly',
					subscription_id: 'A-S123456',
				},
			},
		},
		DataExtensionName: 'SV_RCtoSP_Switch',
		IdentityUserId: '123456789',
	};
	expect(emailMessage).toStrictEqual(expectedOutput);
});

test('We can tell when a subscription has already been switched to Supporter Plus', () => {
	const productCatalog = getProductCatalogFromFixture();
	const subscription = zuoraSubscriptionSchema.parse(alreadySwitchedJson);
	expect(
		subscriptionHasAlreadySwitchedToSupporterPlus(productCatalog, subscription),
	).toEqual(true);
});

test('We throw a validation error (converts to 400) when trying to switch an already switched subscription', () => {
	const productCatalog = getProductCatalogFromFixture();
	const subscription = zuoraSubscriptionSchema.parse(alreadySwitchedJson);
	expect(() =>
		getFirstContributionRatePlan(productCatalog, subscription),
	).toThrow(ValidationError);
});

test('We throw a reference error (converts to 500) if a subscription has no contribution charge', () => {
	const productCatalog = getProductCatalogFromFixture();
	const subscription = zuoraSubscriptionSchema.parse(jsonWithNoContribution);
	expect(() =>
		getFirstContributionRatePlan(productCatalog, subscription),
	).toThrow(ReferenceError);
});
