/**
 * This is a unit test, it can be run by the `pnpm test` command, and will be run by the CI/CD pipeline
 *
 */
import { handleMeEndpoint } from '../src/meEndpoint';

test('me static endpoint', async () => {
	await expect(handleMeEndpoint().then((r) => r.statusCode)).resolves.toEqual(
		200,
	);
});
