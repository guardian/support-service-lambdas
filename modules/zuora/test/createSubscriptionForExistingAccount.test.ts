import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import type { Promo } from '@modules/promotions/v2/schema';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import { createSubscriptionForExistingAccount } from '@modules/zuora/createSubscription/createSubscriptionForExistingAccount';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import code from '../../zuora-catalog/test/fixtures/catalog-code.json';

const buildMockZuoraClient = (
	mockGet: jest.Mock,
	mockPost: jest.Mock,
): jest.Mocked<ZuoraClient> =>
	({
		get: mockGet,
		post: mockPost,
		put: jest.fn(),
		delete: jest.fn(),
		fetch: jest.fn(),
	}) as unknown as jest.Mocked<ZuoraClient>;

const productCatalog = generateProductCatalog(zuoraCatalogSchema.parse(code));

const accountDetailsResponse = {
	basicInfo: { accountNumber: 'A00081977' },
	billingAndPayment: { currency: 'GBP' },
};

const subscriptionResponse = {
	orderNumber: 'ORD-001',
	accountNumber: 'A00081977',
	subscriptionNumbers: ['A-S00001234'],
};

describe('createSubscriptionForExistingAccount', () => {
	it('fetches account details then calls the Orders API with the account number', async () => {
		const mockGet = jest.fn().mockResolvedValueOnce(accountDetailsResponse);
		const mockPost = jest.fn().mockResolvedValueOnce(subscriptionResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		const result = await createSubscriptionForExistingAccount(
			client,
			productCatalog,
			{
				accountNumber: 'A00081977',
				productPurchase: {
					product: 'GuardianAdLite',
					ratePlan: 'Monthly',
				},
			},
			undefined,
		);

		expect(mockGet).toHaveBeenCalledWith(
			'v1/accounts/A00081977',
			expect.anything(),
		);

		// The Orders API must be called with the human-readable account number from the account details
		const [path, body] = mockPost.mock.calls[0] as [string, string];
		expect(path).toBe('/v1/orders');
		const parsed = JSON.parse(body) as Record<string, unknown>;
		expect(parsed.existingAccountNumber).toBe('A00081977');
		expect(parsed).not.toHaveProperty('newAccount');

		expect(result.subscriptionNumbers).toEqual(['A-S00001234']);
	});

	it('passes createdRequestId as the idempotency key', async () => {
		const mockGet = jest.fn().mockResolvedValueOnce(accountDetailsResponse);
		const mockPost = jest.fn().mockResolvedValueOnce(subscriptionResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await createSubscriptionForExistingAccount(
			client,
			productCatalog,
			{
				accountNumber: 'A00081977',
				productPurchase: {
					product: 'GuardianAdLite',
					ratePlan: 'Monthly',
				},
				createdRequestId: 'TEST-IDEMPOTENCY-KEY',
			},
			undefined,
		);

		const [, , , headers] = mockPost.mock.calls[0] as [
			string,
			string,
			unknown,
			Record<string, string> | undefined,
		];
		expect(headers).toEqual({ 'idempotency-key': 'TEST-IDEMPOTENCY-KEY' });
	});

	it('omits idempotency key when createdRequestId is not provided', async () => {
		const mockGet = jest.fn().mockResolvedValueOnce(accountDetailsResponse);
		const mockPost = jest.fn().mockResolvedValueOnce(subscriptionResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await createSubscriptionForExistingAccount(
			client,
			productCatalog,
			{
				accountNumber: 'A00081977',
				productPurchase: {
					product: 'GuardianAdLite',
					ratePlan: 'Monthly',
				},
			},
			undefined,
		);

		const [, , , headers] = mockPost.mock.calls[0] as [
			string,
			string,
			unknown,
			Record<string, string> | undefined,
		];
		expect(headers).toBeUndefined();
	});

	it('includes promo fields in subscription customFields when appliedPromotion is provided', async () => {
		const mockGet = jest.fn().mockResolvedValueOnce(accountDetailsResponse);
		const mockPost = jest.fn().mockResolvedValueOnce(subscriptionResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		const promotion: Promo = {
			name: 'Test Promo',
			campaignCode: 'campaign',
			discount: { amount: 10, durationMonths: 3 },
			appliesTo: {
				countries: ['GB'],
				productRatePlanIds: [
					productCatalog.DigitalSubscription.ratePlans.Monthly.id,
				],
			},
			promoCode: 'PROMO25',
			startTimestamp: '2020-01-01',
			endTimestamp: '2099-01-01',
		};

		await createSubscriptionForExistingAccount(
			client,
			productCatalog,
			{
				accountNumber: 'A00081977',
				productPurchase: {
					product: 'DigitalSubscription',
					ratePlan: 'Monthly',
				},
				appliedPromotion: {
					promoCode: 'PROMO25',
					supportRegionId: SupportRegionId.UK,
				},
			},
			promotion,
		);

		const [, body] = mockPost.mock.calls[0] as [string, string];
		const parsed = JSON.parse(body) as {
			subscriptions: Array<{ customFields: Record<string, string> }>;
		};
		const customFields = parsed.subscriptions[0]?.customFields;
		expect(customFields?.InitialPromotionCode__c).toBe('PROMO25');
		expect(customFields?.PromotionCode__c).toBe('PROMO25');
	});

	it('passes processingOptions from input, defaulting to runBilling and collectPayment true', async () => {
		const mockGet = jest.fn().mockResolvedValueOnce(accountDetailsResponse);
		const mockPost = jest.fn().mockResolvedValueOnce(subscriptionResponse);
		const client = buildMockZuoraClient(mockGet, mockPost);

		await createSubscriptionForExistingAccount(
			client,
			productCatalog,
			{
				accountNumber: 'A00081977',
				productPurchase: {
					product: 'GuardianAdLite',
					ratePlan: 'Monthly',
				},
				runBilling: false,
				collectPayment: false,
			},
			undefined,
		);

		const [, body] = mockPost.mock.calls[0] as [string, string];
		const parsed = JSON.parse(body) as {
			processingOptions: { runBilling: boolean; collectPayment: boolean };
		};
		expect(parsed.processingOptions).toEqual({
			runBilling: false,
			collectPayment: false,
		});
	});
});
