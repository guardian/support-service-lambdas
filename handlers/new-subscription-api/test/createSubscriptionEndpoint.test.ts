import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { createSubscriptionWithExistingPaymentMethod } from '@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import catalogCode from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import { createNewSubscriptionEndpoint } from '../src/createSubscriptionEndpoint';
import type { CreateSubscriptionRequest } from '../src/requestSchema';
import type { CreateSubscriptionResponse } from '../src/responseSchema';

jest.mock('@modules/product-catalog/api');
jest.mock(
	'@modules/zuora/createSubscription/createSubscriptionWithExistingPaymentMethod',
);
jest.mock('@modules/promotions/v2/getPromotion');

const mockGetProductCatalogFromApi = jest.mocked(getProductCatalogFromApi);
const mockCreateSubscriptionWithExistingPaymentMethod = jest.mocked(
	createSubscriptionWithExistingPaymentMethod,
);
const mockGetPromotion = jest.mocked(getPromotion);

const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(catalogCode),
);

const mockZuoraClient = {} as ZuoraClient;

const baseRequest: CreateSubscriptionRequest = {
	accountName: 'Test Account',
	createdRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
	salesforceAccountId: 'sf-acc-123',
	salesforceContactId: 'sf-con-123',
	identityId: 'identity-123',
	currency: 'GBP',
	paymentGateway: 'Stripe PaymentIntents GNM Membership',
	existingPaymentMethod: {
		id: 'pm-123',
		requiresCloning: false,
	},
	billToContact: {
		firstName: 'John',
		lastName: 'Doe',
		workEmail: 'john.doe@example.com',
		country: 'GB',
		address1: '1 Test Street',
		city: 'London',
		postalCode: 'SW1A 1AA',
	},
	productPurchase: {
		product: 'SupporterPlus',
		ratePlan: 'Monthly',
		amount: 10,
	},
};

const expectedResponse: CreateSubscriptionResponse = {
	orderNumber: 'O-00001234',
	accountNumber: 'A-00001234',
	subscriptionNumbers: ['A-S00001234'],
	invoiceNumbers: ['INV-00001234'],
	paymentNumber: 'P-00001234',
	paidAmount: 10,
};

beforeEach(() => {
	jest.clearAllMocks();
	mockGetProductCatalogFromApi.mockResolvedValue(productCatalog);
	mockCreateSubscriptionWithExistingPaymentMethod.mockResolvedValue(
		expectedResponse,
	);
});

describe('createNewSubscriptionEndpoint', () => {
	it('creates a subscription successfully for SupporterPlus Monthly', async () => {
		const result = await createNewSubscriptionEndpoint(
			'CODE',
			mockZuoraClient,
			baseRequest,
		);

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual(expectedResponse);
		expect(mockGetProductCatalogFromApi).toHaveBeenCalledWith('CODE');
		expect(
			mockCreateSubscriptionWithExistingPaymentMethod,
		).toHaveBeenCalledTimes(1);
	});

	it('creates a subscription without promotion when no promoCode is provided', async () => {
		await createNewSubscriptionEndpoint('CODE', mockZuoraClient, baseRequest);

		expect(mockGetPromotion).not.toHaveBeenCalled();
		expect(
			mockCreateSubscriptionWithExistingPaymentMethod,
		).toHaveBeenCalledWith(
			mockZuoraClient,
			productCatalog,
			expect.objectContaining({ appliedPromotion: undefined }),
			undefined,
		);
	});

	it('fetches and applies promotion when promoCode is provided', async () => {
		const promo = {
			promoCode: 'PROMO10',
			name: 'Test Promo',
			campaignCode: 'CAMPAIGN',
			appliesTo: {
				productRatePlanIds: ['rate-plan-id-123'],
				countries: ['GB' as const],
			},
			startTimestamp: '2024-01-01',
			endTimestamp: '2099-01-01',
			discount: { amount: 10, durationMonths: 3 },
		};
		mockGetPromotion.mockResolvedValue(promo);

		const requestWithPromo: CreateSubscriptionRequest = {
			...baseRequest,
			promoCode: 'PROMO10',
		};

		const result = await createNewSubscriptionEndpoint(
			'CODE',
			mockZuoraClient,
			requestWithPromo,
		);

		expect(result.statusCode).toBe(200);
		expect(mockGetPromotion).toHaveBeenCalledWith('PROMO10', 'CODE');
		expect(
			mockCreateSubscriptionWithExistingPaymentMethod,
		).toHaveBeenCalledWith(
			mockZuoraClient,
			productCatalog,
			expect.objectContaining({
				appliedPromotion: { promoCode: 'PROMO10', supportRegionId: 'uk' },
			}),
			promo,
		);
	});

	it('proceeds without promotion when promotion fetch fails', async () => {
		mockGetPromotion.mockRejectedValue(
			new Error('Promotion not found in DynamoDB'),
		);

		const requestWithPromo: CreateSubscriptionRequest = {
			...baseRequest,
			promoCode: 'INVALID_PROMO',
		};

		const result = await createNewSubscriptionEndpoint(
			'CODE',
			mockZuoraClient,
			requestWithPromo,
		);

		expect(result.statusCode).toBe(200);
		expect(
			mockCreateSubscriptionWithExistingPaymentMethod,
		).toHaveBeenCalledWith(
			mockZuoraClient,
			productCatalog,
			expect.objectContaining({ appliedPromotion: undefined }),
			undefined,
		);
	});

	it('passes the correct input fields to createSubscriptionWithExistingPaymentMethod', async () => {
		await createNewSubscriptionEndpoint('CODE', mockZuoraClient, baseRequest);

		expect(
			mockCreateSubscriptionWithExistingPaymentMethod,
		).toHaveBeenCalledWith(
			mockZuoraClient,
			productCatalog,
			expect.objectContaining({
				accountName: 'Test Account',
				createdRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
				salesforceAccountId: 'sf-acc-123',
				salesforceContactId: 'sf-con-123',
				identityId: 'identity-123',
				currency: 'GBP',
				paymentGateway: 'Stripe PaymentIntents GNM Membership',
				existingPaymentMethod: { id: 'pm-123', requiresCloning: false },
				billToContact: expect.objectContaining({
					firstName: 'John',
				}) as unknown,
				productPurchase: expect.objectContaining({
					product: 'SupporterPlus',
					ratePlan: 'Monthly',
				}) as unknown,
			}),
			undefined,
		);
	});
});
