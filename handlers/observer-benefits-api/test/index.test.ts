import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { GuardianSubscription } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { getAccount } from '@modules/zuora/account';
import { ZuoraError } from '@modules/zuora/errors/zuoraError';
import { getSubscription } from '@modules/zuora/subscription';
import type { ZuoraAccount, ZuoraSubscription } from '@modules/zuora/types';
import { handler } from '../src/index';
import type { ResponseBody } from '../src/schemas';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE',
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('@modules/product-catalog/api', () => ({
	getProductCatalogFromApi: jest.fn().mockResolvedValue({}),
}));

jest.mock('@modules/zuora-catalog/S3', () => ({
	getZuoraCatalogFromS3: jest.fn().mockResolvedValue({}),
}));

jest.mock('@modules/zuora/subscription', () => ({
	getSubscription: jest.fn(),
}));

jest.mock('@modules/zuora/account', () => ({
	getAccount: jest.fn(),
}));

jest.mock('@modules/guardian-subscription/guardianSubscriptionParser', () => ({
	GuardianSubscriptionParser: jest.fn().mockImplementation(() => ({
		toGuardianSubscription: jest
			.fn()
			.mockReturnValue({ ratePlans: [], productsNotInCatalog: [] }),
	})),
}));

jest.mock('@modules/guardian-subscription/subscriptionFilter', () => ({
	SubscriptionFilter: {
		activeNonEndedSubscriptionFilter: jest.fn().mockReturnValue({
			filterSubscription: jest
				.fn()
				.mockReturnValue({ ratePlans: [], productsNotInCatalog: [] }),
		}),
	},
}));

jest.mock(
	'@modules/guardian-subscription/getSinglePlanFlattenedSubscriptionOrThrow',
	() => ({
		getSinglePlanFlattenedSubscriptionOrThrow: jest.fn(),
	}),
);

describe('Observer Benefits API', () => {
	const mockGetSubscription = jest.mocked(getSubscription);
	const mockGetAccount = jest.mocked(getAccount);
	const mockGetSinglePlan = jest.mocked(
		getSinglePlanFlattenedSubscriptionOrThrow,
	);

	const mockSubscription = {
		termEndDate: new Date('2027-08-01'),
		accountNumber: 'A00000001',
	} as unknown as ZuoraSubscription;

	const makeAccount = (zipCode: string | null): ZuoraAccount =>
		({ billToContact: { zipCode } }) as unknown as ZuoraAccount;

	const makeGuardianSubscription = (
		productKey: string,
		productRatePlanKey: string,
	): GuardianSubscription =>
		({
			ratePlan: { productKey, productRatePlanKey },
		}) as unknown as GuardianSubscription;

	const defaultEvent: Partial<APIGatewayProxyEvent> = {
		headers: {},
		pathParameters: null,
		queryStringParameters: null,
		body: null,
	};

	const callHandler = (
		event: Partial<APIGatewayProxyEvent>,
	): Promise<APIGatewayProxyResult> =>
		(
			handler as unknown as (
				e: Partial<APIGatewayProxyEvent>,
			) => Promise<APIGatewayProxyResult>
		)({ ...defaultEvent, ...event });

	const validBody = JSON.stringify({
		subscriptionId: 'A-S00000001',
		postCode: 'N1 9GU',
	});

	const baseEvent: Partial<APIGatewayProxyEvent> = {
		httpMethod: 'POST',
		path: '/is-active',
	};
	beforeEach(() => {
		mockGetSubscription.mockResolvedValue(mockSubscription);
	});

	describe('routing and body parsing', () => {
		it('returns 400 when body is missing', async () => {
			const result = await callHandler({ ...baseEvent, body: null });

			expect(result.statusCode).toBe(400);
			expect(mockGetSubscription).not.toHaveBeenCalled();
		});

		it('returns 400 when body is not valid JSON', async () => {
			const result = await callHandler({ ...baseEvent, body: 'not-json' });

			expect(result.statusCode).toBe(400);
			expect(mockGetSubscription).not.toHaveBeenCalled();
		});

		it('returns 400 when body is missing required fields', async () => {
			const result = await callHandler({
				...baseEvent,
				body: JSON.stringify({ subscriptionId: 'A-S00000001' }),
			});

			expect(result.statusCode).toBe(400);
			expect(mockGetSubscription).not.toHaveBeenCalled();
		});

		it('returns 404 for wrong HTTP method', async () => {
			const result = await callHandler({
				httpMethod: 'GET',
				path: '/is-active',
			});

			expect(result.statusCode).toBe(404);
		});
	});

	describe('isActiveEndpoint', () => {
		it('returns isActive true with renews as date for a matching Observer subscription', async () => {
			mockGetAccount.mockResolvedValue(makeAccount('N1 9GU'));
			mockGetSinglePlan.mockReturnValue(
				makeGuardianSubscription('HomeDelivery', 'Everyday'),
			);

			const result = await callHandler({ ...baseEvent, body: validBody });

			const body = JSON.parse(result.body) as ResponseBody;

			expect(result.statusCode).toBe(200);
			expect(body).toEqual({
				isActive: true,
				renews: '2027-08-01',
			});
		});

		it('returns isActive false when postcode does not match', async () => {
			mockGetAccount.mockResolvedValue(makeAccount('N1 9GX'));
			mockGetSinglePlan.mockReturnValue(
				makeGuardianSubscription('HomeDelivery', 'Everyday'),
			);

			const result = await callHandler({ ...baseEvent, body: validBody });
			const body = JSON.parse(result.body) as ResponseBody;

			expect(result.statusCode).toBe(200);
			expect(body.isActive).toBe(false);
		});

		it('returns isActive false when product is not an Observer rate plan', async () => {
			mockGetAccount.mockResolvedValue(makeAccount('N1 9GU'));
			mockGetSinglePlan.mockReturnValue(
				makeGuardianSubscription('Contribution', 'Monthly'),
			);

			const result = await callHandler({ ...baseEvent, body: validBody });
			const body = JSON.parse(result.body) as ResponseBody;

			expect(result.statusCode).toBe(200);
			expect(body.isActive).toBe(false);
		});

		it('returns isActive false when Zuora responds with a 200-coded error', async () => {
			const restResult = {
				status: 200,
				responseBody: '{}',
				responseHeaders: {},
			};
			mockGetAccount.mockRejectedValue(
				new ZuoraError('Not found', restResult, []),
			);

			const result = await callHandler({ ...baseEvent, body: validBody });
			const body = JSON.parse(result.body) as ResponseBody;

			expect(result.statusCode).toBe(200);
			expect(body.isActive).toBe(false);
		});

		it('returns 500 for unexpected errors', async () => {
			mockGetAccount.mockRejectedValue(new Error('Unexpected failure'));

			const result = await callHandler({ ...baseEvent, body: validBody });

			expect(result.statusCode).toBe(500);
		});
	});
});
