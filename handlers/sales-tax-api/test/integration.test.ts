/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */

import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { taxRatesResponseSchema } from '../src/schemas';
import { taxRatesEndpoint } from '../src/taxRatesEndpoint';
import { countryStates } from './fixtures';

describe('SalesTax API Integration', () => {
	const country = 'CA';

	it('returns SupporterPlus Canadian tax rates', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');

		const result = await taxRatesEndpoint(zuoraClient, {
			productKey: 'SupporterPlus',
			country,
		});

		expect(result.statusCode).toEqual(200);
		const body = taxRatesResponseSchema.parse(JSON.parse(result.body));
		expect(body).toEqual(countryStates[country]);
	});

	it('returns a successful response for DigitalSubscription Canadian tax rates', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');

		const result = await taxRatesEndpoint(zuoraClient, {
			productKey: 'DigitalSubscription',
			country,
		});

		expect(result.statusCode).toEqual(200);
	});
});
