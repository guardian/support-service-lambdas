import dayjs from 'dayjs';

/**
 * Tests for the hono route handler using app.request(), which exercises the full
 * hono pipeline (logging middleware, openapi validation, route handler) without
 * needing to construct a Lambda event.
 *
 * The identity check (fetchSubscriptionWithIdentityCheck) is called inside the
 * route handler AFTER input validation, so tests that only check validation
 * responses genuinely need no Zuora mocks — the handler is never reached.
 *
 * Additional tests that could be added here:
 * - Identity mismatch → 400: pass x-identity-id that doesn't match the account's identityId
 * - Zuora errors → 500: mock getSubscription to throw, assert 500 response
 * - Amount below minimum → 400: mock updateSupporterPlusAmount to throw ValidationError
 */

// Validation tests — no mocks needed because hono's defaultHook rejects invalid
// inputs before the route handler (and therefore before any Zuora calls) runs.
describe('Route validation (no mocks needed)', () => {
	beforeEach(() => {
		process.env.STAGE = 'CODE';
		jest.resetModules();
	});

	test('returns 400 when subscription number format is invalid', async () => {
		const { app } = await import('../src/index');
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
		const { app } = await import('../src/index');
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

// Happy path test — mocks all external services so the full handler runs
describe('Route handler (mocked services)', () => {
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

	beforeEach(() => {
		process.env.STAGE = 'CODE';
		jest.resetModules();

		jest.doMock('@modules/zuora/zuoraClient', () => ({
			ZuoraClient: {
				create: jest.fn().mockResolvedValue(mockZuoraClient),
			},
		}));
		jest.doMock('@modules/zuora/subscription', () => ({
			getSubscription: jest.fn().mockResolvedValue(mockSubscription),
		}));
		jest.doMock('@modules/zuora/account', () => ({
			getAccount: jest.fn().mockResolvedValue(mockAccount),
		}));
		jest.doMock('@modules/product-catalog/api', () => ({
			getProductCatalogFromApi: jest.fn().mockResolvedValue({}),
		}));
		jest.doMock('../src/updateSupporterPlusAmount', () => ({
			updateSupporterPlusAmount: jest.fn().mockResolvedValue({
				nextPaymentDate: dayjs(),
				emailAddress: 'test@example.com',
				firstName: 'Test',
				lastName: 'User',
				currency: 'GBP',
				newAmount: 15,
				billingPeriod: 'Month',
				identityId: '999999999999',
			}),
		}));
		// Mock both sendEmail and createThankYouEmail so the email module's
		// DataExtensionNames enum doesn't need to be set up in tests
		jest.doMock('@modules/email/email', () => ({
			sendEmail: jest.fn().mockResolvedValue({}),
		}));
		jest.doMock('../src/sendEmail', () => ({
			createThankYouEmail: jest.fn().mockReturnValue({ mocked: true }),
		}));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test('returns 200 with success message for a valid request', async () => {
		const { app } = await import('../src/index');

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
