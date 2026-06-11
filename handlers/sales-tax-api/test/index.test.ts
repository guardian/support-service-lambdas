import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';
import { countryStates } from '../src/salesTaxEndpoint';
import type { SalesTaxResponse, TaxRatesResponse } from '../src/schemas';
import { cadStates } from '../src/taxRatesEndpoint';

describe('SalesTax API', () => {
	const baseSalesTaxEvent: Partial<APIGatewayProxyEvent> = {
		path: '/tax-rate',
		httpMethod: 'POST',
		headers: {},
	};
	const baseTaxRatesEvent: Partial<APIGatewayProxyEvent> = {
		path: '/tax-rates',
		httpMethod: 'POST',
		headers: {},
	};

	describe('routing and body parsing salesTaxEndpoint', () => {
		it('returns 400 for an empty body', async () => {
			const response = await handler(
				baseSalesTaxEvent as unknown as APIGatewayProxyEvent,
			);

			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 when body not valid JSON', async () => {
			const requestEvent = {
				...baseSalesTaxEvent,
				body: 'inValidJSON',
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 when body is missing required fields', async () => {
			const requestEvent = {
				...baseSalesTaxEvent,
				body: JSON.stringify({
					invalidKey: 'X',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid productKey', async () => {
			const requestEvent = {
				...baseSalesTaxEvent,
				body: JSON.stringify({
					productKey: 'InvalidProductKey',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid country', async () => {
			const requestEvent = {
				...baseSalesTaxEvent,
				body: JSON.stringify({
					country: 'XX',
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(400);
		});
		it('returns 400 for an invalid state', async () => {
			const requestEvent = {
				...baseSalesTaxEvent,
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
				...baseSalesTaxEvent,
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
