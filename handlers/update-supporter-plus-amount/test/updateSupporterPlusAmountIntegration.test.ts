'workers',import console from 'console';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { sendThankYouEmail } from '../src/sendEmail';
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
	const subscriptionNumber = 'A-S00612865';
	const identityId = '200110884';
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

test('We can send a thank you email', async () => {
	// Change the value below to send yourself a thank you email
	const emailAddress = 'no-replay@thegulocal.com';
	const nextPaymentDate = dayjs().add(5, 'day');
	const identityId = '200006098';
	const newAmount = 160;
	const firstName = 'R';
	const lastName = 'B';
	const currency = 'GBP';
	const billingPeriod = 'Month';

	const result = await sendThankYouEmail({
		stage,
		nextPaymentDate,
		emailAddress,
		firstName,
		lastName,
		currency,
		newAmount,
		billingPeriod,
		identityId,
	});

	expect(result.$metadata.httpStatusCode).toEqual(200);
});
