import {
	caStates,
	getCountryNameByIsoCode,
	type IsoCountry,
} from '@modules/internationalisation/country';
import { getZuoraTaxCodes, getZuoraTaxRates } from '@modules/zuora/tax';
import type {
	ZuoraTaxCodes,
	ZuoraTaxRates,
} from '@modules/zuora/types/objects/tax';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../src/index';
// import type { TaxRatesResponse } from '../src/schemas';
// import { cadStates } from '../src/taxRatesEndpoint';

jest.mock('@modules/stage', () => ({
	stageFromEnvironment: () => 'CODE',
}));

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('@modules/zuora/tax', () => ({
	getZuoraTaxCodes: jest.fn(),
	getZuoraTaxRates: jest.fn(),
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
	const country = 'CA';
	const province = 'ON';

	const mockGetZuoraTaxCodes = jest.mocked(getZuoraTaxCodes);
	const mockZuoraTaxCodes = {
		taxCodes: [
			{
				id: '897689',
				taxEngineId: '',
				active: true,
				name: 'Supporter Plus Global Tax',
				description: '',
			},
		],
	} as unknown as ZuoraTaxCodes;

	const mockGetZuoraTaxRates = jest.mocked(getZuoraTaxRates);
	const mockZuoraTaxRates = {
		taxRates: [
			{
				id: '897689',
				taxRatePeriodId: '',
				country: getCountryNameByIsoCode(country),
				state: caStates[province],
				county: null,
				city: null,
				postalCode: null,
				taxRegion: null,
				taxRate1: countryStates[country]?.[province],
				taxRateType1: null,
				taxName1: null,
				taxJursdiction1: null,
				taxLocationCode1: null,
				taxRateDescription1: null,
				taxRate2: 0.0,
				taxRateType2: null,
				taxName2: null,
				taxJursdiction2: null,
				taxLocationCode2: null,
				taxRateDescription2: null,
				taxRate3: 0.0,
				taxRateType3: null,
				taxName3: null,
				taxJursdiction3: null,
				taxLocationCode3: null,
				taxRateDescription3: null,
			},
		],
	} as unknown as ZuoraTaxRates;

	const baseTaxRatesEvent: Partial<APIGatewayProxyEvent> = {
		path: '/tax-rates',
		httpMethod: 'POST',
		headers: {},
	};

	beforeEach(() => {
		mockGetZuoraTaxCodes.mockResolvedValue(mockZuoraTaxCodes);
		mockGetZuoraTaxRates.mockResolvedValue(mockZuoraTaxRates);
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

	// describe('taxRatesZuoraEndpoint', () => {
	// 	it('returns 200 for a valid country, product', async () => {
	// 		const country = 'CA';
	// 		const requestEvent = {
	// 			...baseZuoraTaxRatesEvent,
	// 			body: JSON.stringify({
	// 				productKey: 'SupporterPlus',
	// 				country: country,
	// 			}),
	// 		} as unknown as APIGatewayProxyEvent;

	// 		const response = await handler(requestEvent);
	// 		expect(response.statusCode).toEqual(200);

	// 		const taxRatesResponse = JSON.parse(response.body) as TaxRatesResponse;
	// 		expect(taxRatesResponse).toEqual(cadStates);
	// 	});
	// });
});
