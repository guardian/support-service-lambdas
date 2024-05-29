import console from 'console';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { updateSupporterPlusAmount } from '../src/updateSupporterPlusAmount';

/**
 * This is an integration test, the `@group integration` tag ensures that it will only be run by the `pnpm it-test`
 * command and will not be run during continuous integration.
 * This makes it useful for testing things that require credentials which are available locally but not on the CI server.
 *
 * @group integration
 */
const jestConsole = console;
beforeEach(() => {
	global.console = console;
});
afterEach(() => {
	global.console = jestConsole;
});

const stage = 'CODE';

test('We can carry out an amount change', async () => {
	const subscriptionNumber = 'A-S00603578';
	const identityId = '200090533';
	const newPaymentAmount = 160;
	const zuoraClient = await ZuoraClient.create(stage);
	const productCatalog = await getProductCatalogFromApi(stage);

	const result = await updateSupporterPlusAmount(
		zuoraClient,
		productCatalog,
		identityId,
		subscriptionNumber,
		newPaymentAmount,
	);

	expect(result.newAmount).toEqual(newPaymentAmount);
});
