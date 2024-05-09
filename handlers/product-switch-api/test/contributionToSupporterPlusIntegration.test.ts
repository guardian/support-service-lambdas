/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import console from 'console';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getAccount } from '@modules/zuora/getAccount';
import { getSubscription } from '@modules/zuora/getSubscription';
import { createPayment } from '@modules/zuora/payment';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { doSwitch, preview } from '../src/contributionToSupporterPlus';
import { adjustNonCollectedInvoice } from '../src/payment';
import { getSwitchInformationWithOwnerCheck } from '../src/switchInformation';

const jestConsole = console;
beforeEach(() => {
	global.console = console;
});
afterEach(() => {
	global.console = jestConsole;
});

const stage = 'CODE';
describe('product-switching behaviour', () => {
	it('can preview an annual recurring contribution switch with an additional contribution element', async () => {
		const subscriptionNumber = 'A-S00527544';
		const identityId = '200110678';
		const input = { price: 20, preview: true };
		const zuoraClient = await ZuoraClient.create(stage);
		const productCatalog = await getProductCatalogFromApi(stage);
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const switchInformation = getSwitchInformationWithOwnerCheck(
			stage,
			input,
			subscription,
			account,
			productCatalog,
			identityId,
		);

		const result = await preview(zuoraClient, switchInformation);

		expect(result.supporterPlusPurchaseAmount).toEqual(20);
	});
	it('can preview an annual recurring contribution switch at catalog price', async () => {
		const subscriptionNumber = 'A-S00695309';
		const identityId = '200111098';
		const input = { price: 120, preview: true };
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const switchInformation = getSwitchInformationWithOwnerCheck(
			stage,
			input,
			subscription,
			account,
			productCatalog,
			identityId,
		);

		const result = await preview(zuoraClient, switchInformation);

		const expectedResult = {
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toMatchObject(expectedResult);
	});
	it(
		'can switch a recurring contribution',
		async () => {
			// To run this test you will need to find a recurring contribution which hasn't been switched to supporter plus
			const subscriptionNumber = 'A-S00296219';
			const identityId = '200003401';
			const input = { price: 10, preview: false };
			const zuoraClient = await ZuoraClient.create('CODE');
			const productCatalog = await getProductCatalogFromApi('CODE');
			const subscription = await getSubscription(
				zuoraClient,
				subscriptionNumber,
			);
			const account = await getAccount(zuoraClient, subscription.accountNumber);

			const switchInformation = getSwitchInformationWithOwnerCheck(
				stage,
				input,
				subscription,
				account,
				productCatalog,
				identityId,
			);

			const response = await doSwitch(zuoraClient, switchInformation);
			expect(response.success).toEqual(true);
		},
		1000 * 60,
	);
	it(
		'can take a payment after a switch',
		async () => {
			// To run this test you will need to find a recurring contribution which has been switched to supporter plus but payment hasn't been taken
			const accountId = '8ad08e01852870ed01852acfb3113c90';
			const zuoraClient = await ZuoraClient.create('CODE');
			const invoiceId = '8ad093fb8f0f4d13018f10416bf103a8';
			const defaultPaymentMethodId = '8ad08e01852870ed01852acfb32f3c94';

			await createPayment(
				zuoraClient,
				invoiceId,
				5,
				accountId,
				defaultPaymentMethodId,
				dayjs(),
			);
		},
		1000 * 60,
	);
	it(
		'can adjust an invoice to zero',
		async () => {
			// To run this test you will need to find a recurring contribution which has been switched to supporter plus but payment hasn't been taken
			const zuoraClient = await ZuoraClient.create('CODE');
			const invoiceId = '8ad093788f0f4d2b018f105fe4357ff1';

			const response = await adjustNonCollectedInvoice(
				zuoraClient,
				invoiceId,
				1.33,
				'8ad08cbd8586721c01858804e3715378',
			);

			expect(response.Success).toBe(true);
		},
		1000 * 60,
	);
});
