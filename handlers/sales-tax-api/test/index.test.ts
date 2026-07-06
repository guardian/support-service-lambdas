import type { APIGatewayProxyEvent } from 'aws-lambda';
import {
	getZuoraTaxCodes,
	getZuoraTaxPeriods,
	getZuoraTaxRates,
} from '@modules/zuora/tax';
import type {
	ZuoraTaxCodes,
	ZuoraTaxPeriods,
	ZuoraTaxRates,
} from '@modules/zuora/types/objects/tax';
import { handler } from '../src/index';
import type { TaxRatesResponse } from '../src/schemas';
import {
	canadianZuoraTaxRates,
	countryStates,
	supporterPlusTaxCodeId,
	zuoraTaxCodePeriod,
} from './fixtures';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE',
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('@modules/zuora/tax', () => ({
	getZuoraTaxCodes: jest.fn(),
	getZuoraTaxPeriods: jest.fn(),
	getZuoraTaxRates: jest.fn(),
}));

describe('SalesTax API', () => {
	const province = 'ON';

	const mockGetZuoraTaxCodes = jest.mocked(getZuoraTaxCodes);
	const mockZuoraTaxCodes = {
		taxCodes: [
			{
				id: supporterPlusTaxCodeId,
				taxEngineId: '2c92c0f94568f996014570f746f75c52',
				active: true,
				name: 'Supporter Plus Global Tax',
				description: '',
			},
		],
	} as unknown as ZuoraTaxCodes;

	const mockGetZuoraTaxPeriods = jest.mocked(getZuoraTaxPeriods);
	const mockZuoraTaxPeriods = {
		taxRatePeriods: [zuoraTaxCodePeriod],
	} as unknown as ZuoraTaxPeriods;

	const mockGetZuoraTaxRates = jest.mocked(getZuoraTaxRates);
	const mockZuoraTaxRates = canadianZuoraTaxRates() as unknown as ZuoraTaxRates;

	const baseTaxRatesEvent: Partial<APIGatewayProxyEvent> = {
		path: '/tax-rates',
		httpMethod: 'POST',
		headers: {},
	};

	beforeEach(() => {
		mockGetZuoraTaxCodes.mockResolvedValue(mockZuoraTaxCodes);
		mockGetZuoraTaxPeriods.mockResolvedValue(mockZuoraTaxPeriods);
		mockGetZuoraTaxRates.mockResolvedValue(mockZuoraTaxRates);
	});

	describe('handler', () => {
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

		it('returns 500 if Zuora is missing data', async () => {
			const mockZuoraTaxRatesWithMissingRate = {
				// Remove the tax rate data for a single state
				taxRates: mockZuoraTaxRates.taxRates.slice(0, -1),
			};
			mockGetZuoraTaxRates.mockResolvedValue(mockZuoraTaxRatesWithMissingRate);
			const country = 'CA';
			const requestEvent = {
				...baseTaxRatesEvent,
				body: JSON.stringify({
					productKey: 'SupporterPlus',
					country: country,
				}),
			} as unknown as APIGatewayProxyEvent;

			const response = await handler(requestEvent);

			expect(response.statusCode).toEqual(500);
		});

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
			expect(taxRatesResponse[province]).toEqual(
				countryStates[country]?.[province],
			);
		});
	});
});
