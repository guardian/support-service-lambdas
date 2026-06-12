import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';
import type { TaxRatesResponse } from '../src/schemas';
import { cadStates } from '../src/taxRatesEndpoint';

describe('SalesTax API', () => {
	const baseTaxRatesEvent: Partial<APIGatewayProxyEvent> = {
		path: '/tax-rates',
		httpMethod: 'POST',
		headers: {},
	};

	describe('routing and body parsing taxRatesEndpoint', () => {
		it('returns 400 for an empty body', async () => {
			const response = await handler(
				baseTaxRatesEvent as unknown as APIGatewayProxyEvent,
			);

			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 when body not valid JSON', async () => {
			const requestEvent = {
				...baseTaxRatesEvent,
				body: 'inValidJSON',
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 when body is missing required fields', async () => {
			const requestEvent = {
				...baseTaxRatesEvent,
				body: JSON.stringify({
					invalidKey: 'X',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid productKey', async () => {
			const requestEvent = {
				...baseTaxRatesEvent,
				body: JSON.stringify({
					productKey: 'InvalidProductKey',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid country', async () => {
			const requestEvent = {
				...baseTaxRatesEvent,
				body: JSON.stringify({
					country: 'XX',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
	});

	describe('taxRatesEndpoint', () => {
		it('returns 200 for a valid country, product', async () => {
			const country = 'CA';
			const requestEvent = {
				...baseTaxRatesEvent,
				body: JSON.stringify({
					productKey: 'SupporterPlus',
					country: country,
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(200);

			const taxRatesResponse = JSON.parse(response.body) as TaxRatesResponse;
			expect(taxRatesResponse).toEqual(cadStates);
		});
	});
});
