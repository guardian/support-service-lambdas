/**
 * Integration tests for cloneAccountWithSubscription against the CODE Zuora environment.
 *
 * @group integration
 */

import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { deleteAccount } from '@modules/zuora/account';
import { cloneAccountWithSubscription } from '@modules/zuora/createSubscription/cloneAccountWithSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

describe('run cloneAccountWithSubscription', () => {
	test('clone CreditCardReferenceTransaction', async () => {
		const sourceAccountId = '2c92c0f87568d97201756b1578960694'; // CreditCardReferenceTransaction account in CODE
		const productCatalog = generateProductCatalog(
			zuoraCatalogSchema.parse(code),
		);
		const zuoraClient = await ZuoraClient.create('CODE');
		const requestId = `IT-cloneAccountWithSubscription-${sourceAccountId.slice(-8)}-${Date.now()}`;

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
			},
			undefined,
		);

		expect(response.accountNumber).toBeDefined();
		expect(response.accountNumber).not.toBe('');
		expect(response.subscriptionNumbers.length).toBe(1);
	}, 120000);
	// BankTransfer (GoCardless) mandates are customer-scoped and cannot be transferred to a new account.
	test('throws for BankTransfer (GoCardless) account', async () => {
		const productCatalog = generateProductCatalog(
			zuoraCatalogSchema.parse(code),
		);
		const zuoraClient = await ZuoraClient.create('CODE');

		await expect(
			cloneAccountWithSubscription(
				zuoraClient,
				productCatalog,
				{
					sourceAccountNumber: '2c92c0f8757974d3017594cbffa00536',
					productPurchase: {
						product: 'SupporterPlus',
						ratePlan: 'Monthly',
						amount: 12,
					},
				},
				undefined,
			),
		).rejects.toThrow(/BankTransfer \(GoCardless\)/);
	}, 120000);
});

describe('cloneAccountWithSubscription integration', () => {
	const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));
	let clonedAccountNumber: string | undefined;

	afterEach(async () => {
		if (clonedAccountNumber !== undefined) {
			const zuoraClient = await ZuoraClient.create('CODE');
			await deleteAccount(zuoraClient, clonedAccountNumber);
			clonedAccountNumber = undefined;
		}
	});

	// CreditCardReferenceTransaction accounts can be cloned because the tokenId/secondTokenId
	// (Stripe payment method reference) is preserved and accepted by the Orders API.
	test('clones account 2c92c0f87568d97201756b1578960694 (CreditCardReferenceTransaction) and creates a GuardianAdLite subscription', async () => {
		const sourceAccountId = '2c92c0f87568d97201756b1578960694';
		const zuoraClient = await ZuoraClient.create('CODE');
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

		clonedAccountNumber = response.accountNumber;

		expect(response.accountNumber).toBeDefined();
		expect(response.accountNumber).not.toBe('');
		expect(response.subscriptionNumbers.length).toBe(1);
	}, 120000);

	// PayPal account uses USD, so we use DigitalSubscription Monthly which supports USD.
	test('clones account 2c92c0f875d488d70175d6a29ead032c (PayPal) and creates a DigitalSubscription', async () => {
		const sourceAccountId = '2c92c0f875d488d70175d6a29ead032c';
		const zuoraClient = await ZuoraClient.create('CODE');
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

		clonedAccountNumber = response.accountNumber;

		expect(response.accountNumber).toBeDefined();
		expect(response.accountNumber).not.toBe('');
		expect(response.subscriptionNumbers.length).toBe(1);
	}, 120000);

	// BankTransfer (GoCardless) mandates are customer-scoped and cannot be transferred to a new account.
	test('throws for BankTransfer (GoCardless) account', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');

		await expect(
			cloneAccountWithSubscription(
				zuoraClient,
				productCatalog,
				{
					sourceAccountNumber: '2c92c0f8757974d3017594cbffa00536',
					productPurchase: {
						product: 'SupporterPlus',
						ratePlan: 'Monthly',
						amount: 12,
					},
				},
				undefined,
			),
		).rejects.toThrow(/BankTransfer \(GoCardless\)/);
	}, 120000);
});
