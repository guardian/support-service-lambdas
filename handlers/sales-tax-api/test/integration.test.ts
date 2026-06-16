/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */

import {
	zuoraTaxCodeSchema,
	zuoraTaxPeriodsSchema,
	zuoraTaxRateSchema,
} from '@modules/zuora/types/objects/tax';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { taxRatesResponseSchema } from '../src/schemas';
import {
	taxRatesEndpoint,
	zuoraTaxCodesEndpoint,
	zuoraTaxPeriodsEndpoint,
	zuoraTaxRatesEndpoint,
} from '../src/taxRatesEndpoint';
import {
	countryStates,
	supporterPlusTaxEngineId,
	zuoraTaxCodePeriod,
	zuoraTaxCodeSupporterPlus,
	zuoraTaxRateSupporterPlus,
} from './fixtures';

export {
	supporterPlusTaxCodeId,
	supporterPlusTaxEngineId,
	zuoraTaxCodePeriod,
	zuoraTaxRateSupporterPlus,
} from './fixtures';

describe('SalesTax API Integration', () => {
	const country = 'CA';
	const stage = 'CODE';

	test('we can retrieve all Zuora tax codes', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await zuoraTaxCodesEndpoint(zuoraClient);

		expect(result.statusCode).toEqual(200);
		const body = zuoraTaxCodeSchema.parse(JSON.parse(result.body));
		if (!body) {
			throw new Error('No tax codes found');
		}
		expect(body.taxCodes).toContainEqual(zuoraTaxCodeSupporterPlus);
	});

	test('we can retrieve all Zuora tax periods', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await zuoraTaxPeriodsEndpoint(zuoraClient);

		expect(result.statusCode).toEqual(200);
		const body = zuoraTaxPeriodsSchema.parse(JSON.parse(result.body));
		if (!body) {
			throw new Error('No tax periods found');
		}
		expect(body.taxRatePeriods).toContainEqual(zuoraTaxCodePeriod);
	});

	test('we can retrieve Zuora tax rates for TaxCodeId', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await zuoraTaxRatesEndpoint(zuoraClient, {
			id: supporterPlusTaxEngineId,
		});

		expect(result.statusCode).toEqual(200);
		const body = zuoraTaxRateSchema.parse(JSON.parse(result.body));
		expect(body.taxRates).toContainEqual(zuoraTaxRateSupporterPlus);
	});

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
