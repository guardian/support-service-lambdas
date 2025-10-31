/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
import { GeoPlacesClient } from '@aws-sdk/client-geo-places';
import { autocomplete } from '../src/autoComplete';

test('Auto complete', async () => {
	const geoPlacesClient = new GeoPlacesClient({ region: 'eu-west-1' });
	const response = await autocomplete(geoPlacesClient, '10 Downing ', 10);
	console.log(response);
	expect(response.ResultItems.length).toEqual(10);
});
