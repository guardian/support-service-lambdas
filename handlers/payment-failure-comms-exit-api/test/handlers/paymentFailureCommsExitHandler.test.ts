import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { paymentFailureCommsExitController } from '../../src/handlers/paymentFailureCommsExitController';
import { handler } from '../../src/handlers/paymentFailureCommsExitHandler';

jest.mock('../../src/handlers/paymentFailureCommsExitController', () => ({
	paymentFailureCommsExitController: jest.fn(),
}));

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
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> =>
	(await handler(event, {} as never, jest.fn())) as APIGatewayProxyResult;

describe('paymentFailureCommsExitHandler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(paymentFailureCommsExitController).mockResolvedValue({
			body: JSON.stringify({ status: 'sent' }),
			statusCode: 200,
		});
	});

	it('routes a valid request to the controller with a trimmed Identity ID', async () => {
		await expect(
			invoke(createEvent('{"identityId":"  200000001  "}')),
		).resolves.toEqual({
			body: JSON.stringify({ status: 'sent' }),
			statusCode: 200,
		});

		expect(paymentFailureCommsExitController).toHaveBeenCalledWith({
			identityId: '200000001',
		});
	});

	it.each([
		['a missing body', null],
		['malformed JSON', 'not json'],
		[
			'an unexpected request property',
			'{"identityId":"200000001","extra":true}',
		],
	])('returns 400 for %s', async (_description, body) => {
		const response = await invoke(createEvent(body));

		expect(response.statusCode).toBe(400);
		expect(paymentFailureCommsExitController).not.toHaveBeenCalled();
	});

	it('returns 404 for a route outside the handler contract', async () => {
		await expect(
			invoke(createEvent('{"identityId":"200000001"}', '/other')),
		).resolves.toEqual({
			body: 'Not Found',
			statusCode: 404,
		});
	});
});
