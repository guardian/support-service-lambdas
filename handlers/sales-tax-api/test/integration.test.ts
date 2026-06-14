/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */

import type { IsoCountry } from '@modules/internationalisation/country';
import {
	type ZuoraTaxCode,
	zuoraTaxCodeSchema,
} from '@modules/zuora/types/objects/tax';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { taxRatesResponseSchema } from '../src/schemas';
import {
	taxRatesEndpoint,
	zuoraTaxCodesEndpoint,
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
const zuoraTaxCodeSupporterPlus: ZuoraTaxCode = {
	id: '8ad0887181de06d70181de659fb63b57',
	taxEngineId: '2c92c0f94568f996014570f746f75c52',
	active: true,
	name: 'Supporter Plus',
	description: '',
};

describe('SalesTax API Integration', () => {
	const country = 'CA';
	const stage = 'CODE';

	test('we can retreive tax rates from Zuora', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await taxRatesEndpoint(zuoraClient, {
			productKey: 'SupporterPlus',
			country,
		});

		expect(result.statusCode).toEqual(200);
		const body = taxRatesResponseSchema.parse(JSON.parse(result.body));
		expect(body).toEqual(countryStates[country]);
	});
	test('we can retreive tax codes from Zuora', async () => {
		const zuoraClient = await ZuoraClient.create(stage);

		const result = await zuoraTaxCodesEndpoint(zuoraClient);

		expect(result.statusCode).toEqual(200);
		const body = zuoraTaxCodeSchema.parse(JSON.parse(result.body));
		expect(body.taxCodes).toContainEqual(zuoraTaxCodeSupporterPlus);
	});
	// test('we can retreive SupporterPlus tax rates from Zuora', async () => {
	// 	const zuoraClient = await ZuoraClient.create(stage);

	// 	const result = await zuoraTaxRatesEndpoint(zuoraClient, {
	// 		id: '8ad0887181de06d70181de659fb63b57',
	// 	});

	// 	expect(result.statusCode).toEqual(200);
	// });
});
