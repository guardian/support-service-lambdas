import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { getAccount } from '@modules/zuora/account';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { app } from '../src/index';
import { createThankYouEmail } from '../src/sendEmail';
import { updateSupporterPlusAmount } from '../src/updateSupporterPlusAmount';

// jest.mock() calls are hoisted before static imports at runtime — stageFromEnvironment()
// won't throw when index.ts loads, and all dependency mocks are in place before any
// module code runs. The mocked functions are only *called* at request time, not at
// module load time, so static imports are sufficient — no jest.resetModules() needed.
jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE' as const,
}));
jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn() },
}));
jest.mock('@modules/zuora/subscription', () => ({
	getSubscription: jest.fn(),
}));
jest.mock('@modules/zuora/account', () => ({ getAccount: jest.fn() }));
jest.mock('@modules/product-catalog/api', () => ({
	getProductCatalogFromApi: jest.fn(),
}));
jest.mock('../src/updateSupporterPlusAmount', () => ({
	updateSupporterPlusAmount: jest.fn(),
}));
jest.mock('@modules/email/email', () => ({
	sendEmail: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/sendEmail', () => ({ createThankYouEmail: jest.fn() }));

/**
 * Tests for the hono route handler using app.request(), which exercises the full
 * hono pipeline (logging middleware, openapi validation, route handler) without
 * needing to construct a Lambda event.
 *
 * Additional tests that could be added here:
 * - Identity mismatch → 400: pass x-identity-id that doesn't match the account's identityId
 * - Zuora errors → 500: mock getSubscription to throw, assert 500 response
 * - Amount below minimum → 400: mock updateSupporterPlusAmount to throw ValidationError
 */

const mockZuoraClient = { post: jest.fn(), get: jest.fn() };
const mockSubscription = {
	subscriptionNumber: 'A-S12345678',
	accountNumber: 'A00714188',
	termEndDate: '2027-01-01',
	ratePlans: [],
};
const mockAccount = {
	basicInfo: { identityId: '999999999999' },
	billToContact: {
		workEmail: 'test@example.com',
		firstName: 'Test',
		lastName: 'User',
	},
	billingAndPayment: { currency: 'GBP' },
};

afterEach(() => {
	jest.clearAllMocks();
});

// Validation tests — hono's defaultHook rejects invalid inputs before the route
// handler (and therefore before any Zuora calls) runs.
describe('Route validation (no mocks needed)', () => {
	test('returns 400 when subscription number format is invalid', async () => {
		const response = await app.request(
			'/update-supporter-plus-amount/not-a-sub-number',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newPaymentAmount: 15 }),
			},
		);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toMatchObject({ error: 'Invalid request path - wrong type' });
	});

	test('returns 400 when request body is missing required field', async () => {
		const response = await app.request(
			'/update-supporter-plus-amount/A-S12345678',
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ wrongField: 'value' }),
			},
		);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toMatchObject({ error: 'Invalid request json - wrong type' });
	});
});

// Happy path test — all external services mocked
describe('Route handler (mocked services)', () => {
	beforeEach(() => {
		jest.mocked(ZuoraClient).create.mockResolvedValue(mockZuoraClient as never);
		jest.mocked(getSubscription).mockResolvedValue(mockSubscription as never);
		jest.mocked(getAccount).mockResolvedValue(mockAccount as never);
		jest.mocked(getProductCatalogFromApi).mockResolvedValue({} as never);
		jest.mocked(updateSupporterPlusAmount).mockResolvedValue({
			nextPaymentDate: dayjs(),
			emailAddress: 'test@example.com',
			firstName: 'Test',
			lastName: 'User',
			currency: 'GBP',
			newAmount: 15,
			billingPeriod: 'Month',
			identityId: '999999999999',
		} as never);
		jest.mocked(createThankYouEmail).mockReturnValue({ mocked: true } as never);
	});

	test('returns 200 with success message for a valid request', async () => {
		const response = await app.request(
			'/update-supporter-plus-amount/A-S12345678',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-identity-id': '999999999999',
				},
				body: JSON.stringify({ newPaymentAmount: 15 }),
			},
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({ message: 'Success' });
	});
});
