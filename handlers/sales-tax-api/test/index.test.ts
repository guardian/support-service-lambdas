import type { IsoCountry } from '@modules/internationalisation/country';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';
import type { SalesTaxResponse } from '../src/schemas';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE',
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn().mockResolvedValue({}) },
}));

const countryStates: Partial<Record<IsoCountry, Record<string, number>>> = {
	CA: {
		AB: 0.05,
		BC: 0.12,
		MB: 0.12,
		NB: 0.15,
		NL: 0.15,
		NT: 0.15,
		NS: 0.15,
		NU: 0.05,
		ON: 0.13,
		PE: 0.15,
		QC: 0.1498,
		SK: 0.11,
		YT: 0.05,
	},
};

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
		it('returns 404 for wrong HTTP method', async () => {
			const requestEvent = {
				path: '/tax-rate',
				httpMethod: 'GET',
				headers: {},
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);
			expect(response.statusCode).toEqual(404);
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
