import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';
import { countryStates } from '../src/salesTaxEndpoint';
import type { SalesTaxResponse } from '../src/schemas';

describe('SalesTax API', () => {
	const baseEvent: Partial<APIGatewayProxyEvent> = {
		path: '/tax-rate',
		httpMethod: 'POST',
		headers: {},
	};

	describe('routing and body parsing', () => {
		it('returns 400 for an empty body', async () => {
			const response = await handler(
				baseEvent as unknown as APIGatewayProxyEvent,
			);

			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 when body not valid JSON', async () => {
			const requestEvent = {
				...baseEvent,
				body: 'inValidJSON',
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 when body is missing required fields', async () => {
			const requestEvent = {
				...baseEvent,
				body: JSON.stringify({
					invalidKey: 'X',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid productKey', async () => {
			const requestEvent = {
				...baseEvent,
				body: JSON.stringify({
					productKey: 'InvalidProductKey',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid country', async () => {
			const requestEvent = {
				...baseEvent,
				body: JSON.stringify({
					country: 'XX',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid state', async () => {
			const requestEvent = {
				...baseEvent,
				body: JSON.stringify({
					state: 'XX',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
	});

	describe('salesTaxEndpoint', () => {
		it('returns 200 for a valid country, state, product', async () => {
			const country = 'CA';
			const province = 'ON';
			const requestEvent = {
				...baseEvent,
				body: JSON.stringify({
					productKey: 'SupporterPlus',
					country: country,
					state: province,
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(200);

			const salesTaxResponse = JSON.parse(response.body) as SalesTaxResponse;
			expect(salesTaxResponse.taxRate).toEqual(
				countryStates[country]?.[province],
			);
		});
	});
});
