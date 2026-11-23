import dayjs from 'dayjs';
import { GuardianSubscriptionParser } from '@modules/guardian-subscription/guardianSubscriptionParser';
import { logger } from '@modules/logger/logger';
import { getIfDefined } from '@modules/nullAndUndefined';
import { generateProductCatalog } from '@modules/product-catalog/generateProductCatalog';
import { createSrApi } from '@modules/routing/apiGatewayHandler';
import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import {
	zuoraAccountSchema,
	zuoraSubscriptionSchema,
} from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraCatalogSchema } from '@modules/zuora-catalog/zuoraCatalogSchema';
import catalogJson from '../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import accountJson from '../../product-switch-api/test/fixtures/account.json';
import supporterPlusJson from '../../product-switch-api/test/fixtures/already-switched-subscription.json';
import subscriptionJson from '../../product-switch-api/test/fixtures/subscription.json';
import { api } from '../src/cancel';

jest.mock('@hono/aws-lambda', () => ({ handle: jest.fn() }));

const catalog = zuoraCatalogSchema.parse(catalogJson);
const subscriptionParser = new GuardianSubscriptionParser(
	catalog,
	generateProductCatalog(catalog),
);
const account = zuoraAccountSchema.parse(accountJson);
const zuoraClient = new ZuoraClient({
	getAuthorisation: () =>
		Promise.resolve({ baseUrl: 'https://example.invalid', authHeaders: {} }),
});
const now = jest.fn(() => dayjs('2024-06-10'));
const app = createSrApi(api, { zuoraClient, subscriptionParser, now }, 'CODE');
const headers = { 'Content-Type': 'application/json' };
const missingSubscription = new ZuoraError(
	'Cannot find entity by key',
	{ status: 200, responseBody: {}, responseHeaders: {} },
	[{ code: '50000040', message: 'Cannot find entity by key' }],
);

function preview(identityId?: string) {
	return app.request('/subscriptions/A-S12345678/preview-cancellation', {
		method: 'POST',
		headers: {
			...headers,
			...(identityId === undefined ? {} : { 'x-identity-id': identityId }),
		},
		body: '{}',
	});
}

describe('Cancellation API preview', () => {
	beforeEach(() => {
		jest.spyOn(logger, 'log').mockImplementation(() => undefined);
		jest.spyOn(logger, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		logger.resetContext();
		jest.restoreAllMocks();
	});

	it.each([account.basicInfo.identityId, undefined])(
		'previews an RC for its owner or a CSR (identity %s), using read-only calls',
		async (identityId) => {
			const get = jest
				.spyOn(zuoraClient, 'get')
				.mockResolvedValueOnce(zuoraSubscriptionSchema.parse(subscriptionJson))
				.mockResolvedValueOnce(account);
			const mutate = jest
				.spyOn(zuoraClient, 'fetch')
				.mockRejectedValue(new Error('Unexpected Zuora call'));
			const response = await preview(identityId);

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				type: 'immediate',
				willRefund: false,
			});
			expect(get).toHaveBeenNthCalledWith(
				1,
				'v1/subscriptions/A-S12345678',
				zuoraSubscriptionSchema,
			);
			expect(get).toHaveBeenCalledTimes(2);
			expect(mutate).not.toHaveBeenCalled();
		},
	);

	it('previews an RC with a pending amount change', async () => {
		const subscription = zuoraSubscriptionSchema.parse(subscriptionJson);
		for (const ratePlan of subscription.ratePlans) {
			for (const charge of ratePlan.ratePlanCharges) {
				charge.effectiveStartDate = new Date('2024-07-10');
				charge.price = 75;
			}
		}
		jest
			.spyOn(zuoraClient, 'get')
			.mockResolvedValueOnce(subscription)
			.mockResolvedValueOnce(account);

		const response = await preview();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			type: 'immediate',
			willRefund: false,
		});
	});

	it('rejects a pending subscription card as unsupported rather than failing conversion', async () => {
		const product = getIfDefined(
			catalog.products.find(({ name }) => name === 'Newspaper Digital Voucher'),
			'Subscription card product missing from catalogue fixture',
		);
		const plan = getIfDefined(
			product.productRatePlans.find(({ name }) => name === 'Sixday+'),
			'Sixday+ plan missing from catalogue fixture',
		);
		const subscription = zuoraSubscriptionSchema.parse(subscriptionJson);
		const templatePlan = getIfDefined(
			subscription.ratePlans[0],
			'Missing template plan',
		);
		const templateCharge = getIfDefined(
			templatePlan.ratePlanCharges[0],
			'Missing template charge',
		);
		subscription.customerAcceptanceDate = new Date('2024-06-15');
		subscription.ratePlans = [
			{
				...templatePlan,
				productId: product.id,
				productName: product.name,
				productRatePlanId: plan.id,
				ratePlanName: plan.name,
				ratePlanCharges: plan.productRatePlanCharges.map((charge) => ({
					...templateCharge,
					id: charge.id,
					productRatePlanChargeId: charge.id,
					name: charge.name,
					effectiveStartDate: subscription.customerAcceptanceDate,
				})),
			},
		];
		jest
			.spyOn(zuoraClient, 'get')
			.mockResolvedValueOnce(subscription)
			.mockResolvedValueOnce(account);

		const response = await preview();

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message:
				'Cancellation preview is currently only supported for recurring contributions',
		});
	});

	it.each(['missing', 'unowned'])(
		'returns the original identity error for a %s subscription before conversion',
		async (scenario) => {
			const get = jest.spyOn(zuoraClient, 'get');
			if (scenario === 'missing') {
				get.mockRejectedValueOnce(missingSubscription);
			} else {
				get
					.mockResolvedValueOnce(
						zuoraSubscriptionSchema.parse(subscriptionJson),
					)
					.mockResolvedValueOnce(account);
			}
			const convert = jest.spyOn(subscriptionParser, 'toGuardianSubscription');
			const response = await preview('12345');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual({
				message: 'Subscription does not belong to identity ID 12345',
			});
			expect(convert).not.toHaveBeenCalled();
		},
	);

	it.each([
		{
			name: 'already-cancelled subscriptions',
			subscription: { ...subscriptionJson, status: 'Cancelled', ratePlans: [] },
			message: 'Subscription is already cancelled',
		},
		{
			name: 'S+ subscriptions, even with a contribution charge',
			subscription: supporterPlusJson,
			message:
				'Cancellation preview is currently only supported for recurring contributions',
		},
	])('rejects $name', async ({ subscription, message }) => {
		jest
			.spyOn(zuoraClient, 'get')
			.mockResolvedValueOnce(zuoraSubscriptionSchema.parse(subscription))
			.mockResolvedValueOnce(account);

		const response = await preview(account.basicInfo.identityId);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ message });
	});

	it('reloads customer data and reevaluates the clock per request, excluding the charge end date', async () => {
		const subscription = zuoraSubscriptionSchema.parse(subscriptionJson);
		const get = jest
			.spyOn(zuoraClient, 'get')
			.mockResolvedValueOnce(subscription)
			.mockResolvedValueOnce(account)
			.mockResolvedValueOnce(subscription)
			.mockResolvedValueOnce(account);
		now
			.mockReturnValueOnce(dayjs('2025-05-08T23:59:59Z'))
			.mockReturnValueOnce(dayjs('2025-05-09T00:00:00Z'));

		expect((await preview()).status).toBe(200);
		expect((await preview()).status).toBe(400);
		expect(get).toHaveBeenCalledTimes(4);
	});

	it.each([{}, { reason: 'mma_other' }])(
		'leaves the execute placeholder unchanged for %j',
		async (body) => {
			const response = await app.request('/subscriptions/A-S12345678/cancel', {
				method: 'POST',
				headers,
				body: JSON.stringify(body),
			});

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				type: 'immediate',
				willRefund: false,
			});
		},
	);
});
