/**
 * Tests zuora-secrets integration
 *
 * @group integration
 */

import { getSecrets } from '../src/zuora-secrets';

test('getZuoraSecrets', async () => {
	const secret = await getSecrets('CODE');
	expect(secret.clientSecret.length).toBeGreaterThan(0);
});
