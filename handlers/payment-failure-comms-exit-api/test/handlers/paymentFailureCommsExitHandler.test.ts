import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { buildPaymentFailureCommsExitHandler } from '../../src/handlers/paymentFailureCommsExitHandler';
import type { RuntimeDeps } from '../../src/types/runtimeDeps';

const createEvent = (
	body: string | null,
	path: string = '/exit',
): APIGatewayProxyEvent =>
	({
		body,
		headers: {},
		httpMethod: 'POST',
		path,
	}) as APIGatewayProxyEvent;

const invoke = async (
	deps: RuntimeDeps,
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> =>
	(await buildPaymentFailureCommsExitHandler(deps)(
		event,
		{} as never,
		jest.fn(),
	)) as APIGatewayProxyResult;

const createDeps = (overrides: Partial<RuntimeDeps> = {}): RuntimeDeps => ({
	getBrazeUuidFromIdapi: jest.fn().mockResolvedValue('braze-uuid'),
	sendPaymentFailureExitEvent: jest.fn().mockResolvedValue(undefined),
	now: jest.fn().mockReturnValue('2026-09-08T12:00:00.000Z'),
	...overrides,
});

describe('paymentFailureCommsExitHandler', () => {
	it('looks up the Identity user, sends its Braze exit event, and confirms success', async () => {
		const deps = createDeps();

		await expect(
			invoke(deps, createEvent('{"identityId":"200000001"}')),
		).resolves.toEqual({
			body: JSON.stringify({ status: 'sent' }),
			statusCode: 200,
		});

		expect(deps.getBrazeUuidFromIdapi).toHaveBeenCalledWith('200000001');
		expect(deps.sendPaymentFailureExitEvent).toHaveBeenCalledWith(
			'braze-uuid',
			'2026-09-08T12:00:00.000Z',
		);
	});

	it.each([
		['a missing body', null],
		['malformed JSON', 'not json'],
		[
			'an unexpected request property',
			'{"identityId":"200000001","extra":true}',
		],
		['an Identity ID containing whitespace', '{"identityId":" 200000001 "}'],
		['an Identity ID containing letters', '{"identityId":"identity-123"}'],
	])('returns 400 for %s', async (_description, body) => {
		const deps = createDeps();
		const response = await invoke(deps, createEvent(body));

		expect(response.statusCode).toBe(400);
		expect(deps.getBrazeUuidFromIdapi).not.toHaveBeenCalled();
		expect(deps.sendPaymentFailureExitEvent).not.toHaveBeenCalled();
	});

	it('returns a helpful 404 without calling Braze when the Identity user is not found', async () => {
		const deps = createDeps({
			getBrazeUuidFromIdapi: jest.fn().mockResolvedValue(undefined),
		});

		await expect(
			invoke(deps, createEvent('{"identityId":"200000001"}')),
		).resolves.toEqual({
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				message: 'Identity user was not found for the supplied Identity ID',
			}),
			statusCode: 404,
		});
		expect(deps.sendPaymentFailureExitEvent).not.toHaveBeenCalled();
	});

	it.each([
		[
			'IDAPI returns a user without a Braze UUID',
			{
				getBrazeUuidFromIdapi: jest
					.fn()
					.mockRejectedValue(
						new Error('Identity user does not have a Braze UUID'),
					),
			},
		],
		[
			'Braze rejects the exit event',
			{
				sendPaymentFailureExitEvent: jest
					.fn()
					.mockRejectedValue(new Error('Braze unavailable')),
			},
		],
	])('returns 500 for %s', async (_description, overrides) => {
		const deps = createDeps(overrides);

		await expect(
			invoke(deps, createEvent('{"identityId":"200000001"}')),
		).resolves.toEqual({
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: 'Internal server error' }),
			statusCode: 500,
		});
	});
});
