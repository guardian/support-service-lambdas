import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';
import type { SalesTaxResponse } from '../src/salesTaxEndpoint';

describe('handler', () => {
	it('returns 400 for an empty body', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});
	it('returns 400 for an invalid productKey', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
			body: JSON.stringify({
				productKey: 'InvalidProductKey',
			}),
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});
	it('returns 400 for an invalid country', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
			body: JSON.stringify({
				country: 'XX',
			}),
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});
	it('returns 400 for an invalid state', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
			body: JSON.stringify({
				state: 'XX',
			}),
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);

		expect(response.statusCode).toEqual(400);
	});
	it('returns 200 for a valid country, state, product', async () => {
		const requestEvent = {
			path: '/tax-rate',
			httpMethod: 'POST',
			headers: {},
			body: JSON.stringify({
				productKey: 'SupporterPlus',
				country: 'CA',
				state: 'ON',
			}),
		} as unknown as APIGatewayProxyEvent;

		const response = await handler(requestEvent);
		expect(response.statusCode).toEqual(200);

		const salesTaxResponse = JSON.parse(response.body) as SalesTaxResponse;
		expect(salesTaxResponse.taxRate).toEqual(0.13);
	});
});
