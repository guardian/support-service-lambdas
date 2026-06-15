/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */

import type { IsoCountry } from '@modules/internationalisation/country';
// import type { ZuoraTaxRate } from '@modules/zuora/types/objects/tax';
// import type { ZuoraTaxPeriod } from '@modules/zuora/types/objects/tax';
import {
	type ZuoraTaxCode,
	zuoraTaxCodeSchema,
	// zuoraTaxRateSchema,
	// zuoraTaxPeriodsSchema,
} from '@modules/zuora/types/objects/tax';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { taxRatesResponseSchema } from '../src/schemas';
import {
	taxRatesEndpoint,
	zuoraTaxCodesEndpoint,
	// zuoraTaxPeriodsEndpoint,
	// zuoraTaxRatesEndpoint,
} from '../src/taxRatesEndpoint';

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
const supporterPlusTaxCodeId = '8ad0887181de06d70181de659fb63b57';
// const supporterPlusTaxEngineId = '8ad095dd81de1cf00181de66e7404253';
const zuoraTaxCodeSupporterPlus: ZuoraTaxCode = {
	id: supporterPlusTaxCodeId,
	taxEngineId: '2c92c0f94568f996014570f746f75c52',
	active: true,
	name: 'Supporter Plus',
	description: '',
};
// const zuoraTaxCodePeriod: ZuoraTaxPeriod = {
// 	id: supporterPlusTaxEngineId,
// 	startDate: new Date('2022-07-08'),
// 	endDate: null,
// 	taxCodeId: supporterPlusTaxCodeId,
// };
// const zuoraTaxRateSupporterPlus: ZuoraTaxRate = {
// 	id: 'id-unused',
// 	taxRatePeriodId: supporterPlusTaxEngineId,
// 	country: 'Canada',
// 	state: 'Ontario',
// 	county: null,
// 	city: null,
// 	postalCode: null,
// 	taxRegion: null,
// 	taxRate1: 0.13,
// 	taxRateType1: 'Percentage',
// 	taxName1: 'US TAX',
// 	taxJursdiction1: 'Country',
// 	taxLocationCode1: 'CA',
// 	taxRateDescription1: '',
// 	taxRate2: 0,
// 	taxRateType2: null,
// 	taxName2: null,
// 	taxJursdiction2: null,
// 	taxLocationCode2: null,
// 	taxRateDescription2: null,
// 	taxRate3: 0,
// 	taxRateType3: null,
// 	taxName3: null,
// 	taxJursdiction3: null,
// 	taxLocationCode3: null,
// 	taxRateDescription3: null,
// };

describe('SalesTax API Integration', () => {
	const country = 'CA';
	const stage = 'CODE';

	test('we can retrieve all Zuora tax codes', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await zuoraTaxCodesEndpoint(zuoraClient);

		expect(result.statusCode).toEqual(200);
		const body = zuoraTaxCodeSchema.parse(JSON.parse(result.body));
		expect(body.taxCodes).toContainEqual(zuoraTaxCodeSupporterPlus);
	});

	// test('we can retrieve all Zuora tax periods', async () => {
	// 	const zuoraClient = await ZuoraClient.create(stage);

	// 	const result = await zuoraTaxPeriodsEndpoint(zuoraClient);

	// 	expect(result.statusCode).toEqual(200);
	// 	const body = zuoraTaxPeriodsSchema.parse(JSON.parse(result.body));
	// 	expect(body.taxRatePeriods).toContainEqual(zuoraTaxCodePeriod);
	// });

	// test('we can retrieve Zuora tax rates for TaxCodeId', async () => {
	// 	const zuoraClient = await ZuoraClient.create(stage);

	// 	const result = await zuoraTaxRatesEndpoint(zuoraClient, {
	// 		id: supporterPlusTaxCodeId,
	// 	});

	// 	expect(result.statusCode).toEqual(200);
	// 	const body = zuoraTaxRateSchema.parse(JSON.parse(result.body));
	// 	expect(body.taxRates).toContainEqual(zuoraTaxRateSupporterPlus);
	// });

	test('we can retrieve SupporterPlus Canadian tax rates', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await taxRatesEndpoint(zuoraClient, {
			productKey: 'SupporterPlus',
			country,
		});

		expect(result.statusCode).toEqual(200);
		const body = taxRatesResponseSchema.parse(JSON.parse(result.body));
		expect(body).toEqual(countryStates[country]);
	});
});
