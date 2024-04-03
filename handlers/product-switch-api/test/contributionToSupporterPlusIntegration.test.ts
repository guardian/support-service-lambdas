/**
 * Switch a recurring contribution to supporter plus using Zuora's Orders api
 *
 * @group integration
 */
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { zuoraDateFormat } from '@modules/zuora/common';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { doSwitch, preview } from '../src/contributionToSupporterPlus';
import { getCatalogInformation } from '../src/helpers';

describe('product-switching behaviour', () => {
	it('can preview an annual recurring contribution switch with an additional contribution element', async () => {
		const accountNumber = 'A00701136';
		const subscriptionNumber = 'A-S00695309';
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const catalogInformation = getCatalogInformation(
			productCatalog,
			'Annual',
			'USD',
		);

		const result = await preview(
			zuoraClient,
			accountNumber,
			subscriptionNumber,
			25,
			catalogInformation,
		);

		const expectedResult = {
			amountPayableToday: 132.09,
			contributionRefundAmount: -12.91,
			supporterPlusPurchaseAmount: 145,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toStrictEqual(expectedResult);
	});
	it('can preview an annual recurring contribution switch at catalog price', async () => {
		const accountNumber = 'A00701136';
		const subscriptionNumber = 'A-S00695309';
		const zuoraClient = await ZuoraClient.create('CODE');
		const productCatalog = await getProductCatalogFromApi('CODE');
		const catalogInformation = getCatalogInformation(
			productCatalog,
			'Annual',
			'USD',
		);

		const result = await preview(
			zuoraClient,
			accountNumber,
			subscriptionNumber,
			0,
			catalogInformation,
		);

		const expectedResult = {
			amountPayableToday: 107.09,
			contributionRefundAmount: -12.91,
			supporterPlusPurchaseAmount: 120,
			nextPaymentDate: zuoraDateFormat(dayjs().add(1, 'year').endOf('day')),
		};

		expect(result).toStrictEqual(expectedResult);
	});
	it(
		'can switch an annual recurring contribution',
		async () => {
			const accountNumber = 'A00251726';
			const subscriptionNumber = 'A-S00267726';
			const zuoraClient = await ZuoraClient.create('CODE');
			const productCatalog = await getProductCatalogFromApi('CODE');
			const catalogInformation = getCatalogInformation(
				productCatalog,
				'Annual',
				'GBP',
			);

			const result = await doSwitch(
				zuoraClient,
				accountNumber,
				subscriptionNumber,
				25,
				catalogInformation,
			);
			expect(result.success).toBe(true);
		},
		1000 * 60,
	);
});
