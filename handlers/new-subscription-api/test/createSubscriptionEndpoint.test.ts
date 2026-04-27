/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return -- jest expect matchers and requireActual return any */
import { SupportRegionId } from '@modules/internationalisation/countryGroup';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { getPromotion } from '@modules/promotions/v2/getPromotion';
import { clonePaymentMethod } from '@modules/zuora/createSubscription/clonePaymentMethod';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import catalogCode from '../../../modules/zuora-catalog/test/fixtures/catalog-code.json';
import type { CreateSubscriptionResponse } from '../src/responseSchema';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn(() => 'CODE'),
}));
jest.mock('@modules/product-catalog/api');
jest.mock('@modules/promotions/v2/getPromotion', () => ({
	...jest.requireActual('@modules/promotions/v2/getPromotion'),
	getPromotion: jest.fn(),
}));
jest.mock('@modules/zuora/zuoraClient');
jest.mock('@modules/zuora/createSubscription/clonePaymentMethod');
jest.mock('@modules/zuora/orders/orderRequests');

const mockGetProductCatalogFromApi = jest.mocked(getProductCatalogFromApi);
const mockGetPromotion = jest.mocked(getPromotion);
const mockClonePaymentMethod = jest.mocked(clonePaymentMethod);
const mockExecuteOrderRequest = jest.mocked(executeOrderRequest);
// eslint-disable-next-line @typescript-eslint/unbound-method -- ZuoraClient.create is a static factory method, `this` binding is not relevant
const mockZuoraClientCreate = jest.mocked(ZuoraClient.create);

const productCatalog = generateProductCatalog(
	zuoraCatalogSchema.parse(catalogCode),
);

const mockZuoraClient = {} as ZuoraClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- import handler after mocks are set up to ensure module-level code uses mocked dependencies
const { handler } = require('../src/index') as {
	handler: (
		event: APIGatewayProxyEvent,
	) => Promise<{ statusCode: number; body: string }>;
};

const baseRequestBody = {
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
		amount: 25,
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

const makeEvent = (body: unknown): APIGatewayProxyEvent =>
	({
		path: '/subscription',
		httpMethod: 'POST',
		headers: {},
		body: JSON.stringify(body),
	}) as unknown as APIGatewayProxyEvent;

beforeEach(() => {
	jest.clearAllMocks();
	mockZuoraClientCreate.mockResolvedValue(mockZuoraClient);
	mockGetProductCatalogFromApi.mockResolvedValue(productCatalog);
	mockClonePaymentMethod.mockResolvedValue({
		hpmCreditCardPaymentMethodId: 'pm-123',
	});
	mockExecuteOrderRequest.mockResolvedValue(expectedResponse);
});

describe('createNewSubscriptionEndpoint', () => {
	it('creates a subscription successfully for SupporterPlus Monthly', async () => {
		const result = await handler(makeEvent(baseRequestBody));

		expect(result.statusCode).toBe(200);
		expect(JSON.parse(result.body)).toEqual(expectedResponse);
		expect(mockExecuteOrderRequest).toHaveBeenCalledTimes(1);
	});

	it('creates a subscription without promotion when no promoCode is provided', async () => {
		await handler(makeEvent(baseRequestBody));

		expect(mockGetPromotion).not.toHaveBeenCalled();
	});

	it('fetches and applies promotion when promoCode is provided', async () => {
		const promo = {
			promoCode: 'E2E_TEST_SPLUS_MONTHLY',
			name: 'Test Promo',
			campaignCode: 'CAMPAIGN',
			appliesTo: {
				// Real SupporterPlus Monthly rate plan ID from the CODE catalog
				productRatePlanIds: ['8ad08cbd8586721c01858804e3275376'],
				countries: ['GB' as const],
			},
			startTimestamp: '2024-01-01',
			endTimestamp: '2099-01-01',
			discount: { amount: 10, durationMonths: 3 },
		};
		mockGetPromotion.mockResolvedValue(promo);

		const result = await handler(
			makeEvent({
				...baseRequestBody,
				appliedPromotion: {
					promoCode: 'E2E_TEST_SPLUS_MONTHLY',
					supportRegionId: SupportRegionId.UK,
				},
			}),
		);

		expect(result.statusCode).toBe(200);
		expect(mockGetPromotion).toHaveBeenCalledWith(
			'E2E_TEST_SPLUS_MONTHLY',
			'CODE',
		);
		expect(mockExecuteOrderRequest).toHaveBeenCalledWith(
			mockZuoraClient,
			expect.objectContaining({
				subscriptions: expect.arrayContaining([
					expect.objectContaining({
						customFields: expect.objectContaining({
							InitialPromotionCode__c: 'E2E_TEST_SPLUS_MONTHLY',
						}),
					}),
				]),
			}),
			expect.anything(),
			expect.anything(),
		);
	});

	it('returns 500 when promotion fetch fails', async () => {
		mockGetPromotion.mockRejectedValue(
			new Error('Promotion not found in DynamoDB'),
		);

		const result = await handler(
			makeEvent({
				...baseRequestBody,
				appliedPromotion: {
					promoCode: 'INVALID_PROMO',
					supportRegionId: SupportRegionId.UK,
				},
			}),
		);

		expect(result.statusCode).toBe(500);
		expect(mockExecuteOrderRequest).toHaveBeenCalledTimes(0);
	});

	it('returns 400 with error message when promotion is expired', async () => {
		const expiredPromo = {
			promoCode: 'EXPIRED_PROMO',
			name: 'Test Promo',
			campaignCode: 'CAMPAIGN',
			appliesTo: {
				productRatePlanIds: ['rate-plan-id-123'],
				countries: ['GB' as const],
			},
			startTimestamp: '2019-01-01',
			endTimestamp: '2020-01-01',
			discount: { amount: 10, durationMonths: 3 },
		};
		mockGetPromotion.mockResolvedValue(expiredPromo);

		const result = await handler(
			makeEvent({
				...baseRequestBody,
				appliedPromotion: {
					promoCode: 'EXPIRED_PROMO',
					supportRegionId: SupportRegionId.UK,
				},
			}),
		);

		expect(result.statusCode).toBe(400);
		expect(result.body).toContain('expired');
		expect(mockExecuteOrderRequest).not.toHaveBeenCalled();
	});

	it('returns 400 when request body is invalid', async () => {
		const result = await handler(
			makeEvent({ ...baseRequestBody, currency: 'INVALID' }),
		);

		expect(result.statusCode).toBe(400);
		expect(mockExecuteOrderRequest).not.toHaveBeenCalled();
	});

	it('passes the correct account fields to executeOrderRequest', async () => {
		await handler(makeEvent(baseRequestBody));

		expect(mockExecuteOrderRequest).toHaveBeenCalledWith(
			mockZuoraClient,
			expect.objectContaining({
				newAccount: expect.objectContaining({
					crmId: 'sf-acc-123',
					currency: 'GBP',
					billToContact: expect.objectContaining({
						firstName: 'John',
					}),
					customFields: expect.objectContaining({
						IdentityId__c: 'identity-123',
						sfContactId__c: 'sf-con-123',
					}),
				}),
			}),
			expect.anything(),
			expect.anything(),
		);
	});
});
