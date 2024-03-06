/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */

import { writeProductCatalogToS3 } from '../src';

test('We can generate a product catalog and save it to S3', async () => {
	await expect(writeProductCatalogToS3('CODE')).resolves.not.toThrow();
});
