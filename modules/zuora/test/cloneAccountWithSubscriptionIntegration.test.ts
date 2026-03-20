/**
 *
 * @group integration
 */

import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { z } from 'zod';
import { deleteAccount } from '@modules/zuora/account';
import { cloneAccountWithSubscription } from '@modules/zuora/createSubscription/cloneAccountWithSubscription';
import { getSubscription } from '@modules/zuora/subscription';
import { zuoraSubscriptionSchema } from '@modules/zuora/types/objects/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

describe('cloneAccountWithSubscription integration', () => {
	const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));
	let zuoraClient: ZuoraClient;

	beforeAll(async () => {
		zuoraClient = await ZuoraClient.create('CODE');
	});

	test('clones a CreditCardReferenceTransaction account and creates a GuardianAdLite subscription', async () => {
		const sourceAccountId = '2c92c0f87568d97201756b1578960694';
		const requestId = `IT-cloneAccountWithSubscription-${sourceAccountId.slice(-8)}-${Date.now()}`;

		const response = await cloneAccountWithSubscription(
			zuoraClient,
			productCatalog,
			{
				sourceAccountNumber: sourceAccountId,
				productPurchase: { product: 'GuardianAdLite', ratePlan: 'Monthly' },
				createdRequestId: requestId,
				runBilling: true,
				collectPayment: true,
			},
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('clones a PayPal account and creates a DigitalSubscription', async () => {
		const sourceAccountId = '2c92c0f875d488d70175d6a29ead032c';
		const requestId = `IT-cloneAccountWithSubscription-${sourceAccountId.slice(-8)}-${Date.now()}`;

		const response = await cloneAccountWithSubscription(
			zuoraClient,
			productCatalog,
			{
				sourceAccountNumber: sourceAccountId,
				productPurchase: {
					product: 'DigitalSubscription',
					ratePlan: 'Monthly',
				},
				createdRequestId: requestId,
				runBilling: false,
				collectPayment: false,
			},
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('clones a BankTransfer (GoCardless) account', async () => {
		const requestId = `IT-cloneAccountWithSubscription-BankTransfer-${Date.now()}`;

		const response = await cloneAccountWithSubscription(
			zuoraClient,
			productCatalog,
			{
				sourceAccountNumber: '2c92c0f8757974d3017594cbffa00536',
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 12,
				},
				createdRequestId: requestId,
				runBilling: true,
				collectPayment: true,
			},
			undefined,
		);

		expect(response.accountNumber).toMatch(/^A\d+$/);
		expect(response.subscriptionNumbers.length).toBe(1);

		//await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);

	test('clones an account and applies a promo code to the new subscription', async () => {
		const sourceAccountId = '2c92c0f87568d97201756b1578960694';
		const promoCode = 'E2E_TEST_SPLUS_MONTHLY';
		const promotion = await getPromotion(promoCode, 'CODE');
		const requestId = `IT-cloneAccountWithSubscription-promo-${sourceAccountId.slice(-8)}-${Date.now()}`;

		const response = await cloneAccountWithSubscription(
			zuoraClient,
			productCatalog,
			{
				sourceAccountNumber: sourceAccountId,
				productPurchase: {
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
					amount: 12,
				},
				createdRequestId: requestId,
				appliedPromotion: {
					promoCode,
					supportRegionId: SupportRegionId.UK,
				},
				runBilling: false,
				collectPayment: false,
			},
			promotion,
		);

		expect(response.subscriptionNumbers.length).toBe(1);

		const subscriptionWithPromotionSchema = zuoraSubscriptionSchema.extend({
			InitialPromotionCode__c: z.string().nullable(),
			PromotionCode__c: z.string().nullable(),
		});
		const subscription = await getSubscription(
			zuoraClient,
			response.subscriptionNumbers[0]!,
			subscriptionWithPromotionSchema,
		);

		expect(subscription.ratePlans.length).toEqual(2); // product rate plan + discount rate plan
		expect(subscription.InitialPromotionCode__c).toEqual(promoCode);
		expect(subscription.PromotionCode__c).toEqual(promoCode);

		await deleteAccount(zuoraClient, response.accountNumber);
	}, 120000);
});
