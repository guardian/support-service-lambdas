/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import console from 'console';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { zuoraDateFormat } from '@modules/zuora/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { doSwitch, preview } from '../src/contributionToSupporterPlus';
import { getSwitchInformationWithOwnerCheck } from '../src/userInformation';

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
		const zuoraClient = await ZuoraClient.create(stage);
		const productCatalog = await getProductCatalogFromApi(stage);

		const switchInformation = await getSwitchInformationWithOwnerCheck(
			stage,
			true,
			zuoraClient,
			productCatalog,
			identityId,
			subscriptionNumber,
			20,
		);

		const result = await preview(zuoraClient, switchInformation);

		expect(result.supporterPlusPurchaseAmount).toEqual(10);
	});
	it('can preview an annual recurring contribution switch at catalog price', async () => {
		const subscriptionNumber = 'A-S00695309';
		const identityId = '200111098';
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');

		const switchInformation = await getSwitchInformationWithOwnerCheck(
			stage,
			true,
			zuoraClient,
			productCatalog,
			identityId,
			subscriptionNumber,
			120,
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
			const subscriptionNumber = 'A-S00732420';
			const identityId = '109663794';
			const zuoraClient = await ZuoraClient.create('CODE');
			const productCatalog = await getProductCatalogFromApi('CODE');
			const switchInformation = await getSwitchInformationWithOwnerCheck(
				stage,
				false,
				zuoraClient,
				productCatalog,
				identityId,
				subscriptionNumber,
				10,
			);

			const paidAmount = await doSwitch(zuoraClient, switchInformation);
			expect(paidAmount).toBeGreaterThan(0);
		},
		1000 * 60,
	);
});
