import type { Stage } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getPastInvoiceItems } from '../../src/handlers/getOldPaymentAmount';

jest.mock('@modules/zuora/query');

const stage: Stage = 'CODE';
// describe('getPastInvoiceItems', () => {
// 	beforeEach(() => {
// 		jest.resetAllMocks();
// 	});

// 	test('should return past invoice items for a given subscription and target date', async () => {
// 		(doQuery as jest.Mock).mockResolvedValue({ records: [{}, {}] });

// 		const zuoraClient = await ZuoraClient.create(stage);
// 		const result = await getPastInvoiceItems(
// 			zuoraClient,
// 			'A-S12345678',
// 			'2022-01-01',
// 		);
// 		console.log('XXX result:', result);
// 		console.log('YYY zuoraClient:', zuoraClient);
// 	});
// });
jest.mock('@modules/zuora/query');

describe('getPastInvoiceItems', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	// test('should return past invoice items for a given subscription and target date', async () => {
	// 	(doQuery as jest.Mock).mockResolvedValue({
	// 		records: [
	// 			{
	// 				ChargeAmount: 100,
	// 				TaxAmount: 10,
	// 				ServiceStartDate: '2022-01-01',
	// 				SubscriptionNumber: 'A-S12345678',
	// 			},
	// 			{
	// 				ChargeAmount: 200,
	// 				TaxAmount: 20,
	// 				ServiceStartDate: '2022-01-01',
	// 				SubscriptionNumber: 'A-S12345678',
	// 			},
	// 		],
	// 	});

	// 	const zuoraClient = await ZuoraClient.create(stage);
	// 	const result = await getPastInvoiceItems(
	// 		zuoraClient,
	// 		'A-S12345678',
	// 		'2022-01-01',
	// 	);

	// 	expect(result).toEqual([
	// 		{
	// 			ChargeAmount: 100,
	// 			TaxAmount: 10,
	// 			ServiceStartDate: '2022-01-01',
	// 			SubscriptionNumber: 'A-S12345678',
	// 		},
	// 		{
	// 			ChargeAmount: 200,
	// 			TaxAmount: 20,
	// 			ServiceStartDate: '2022-01-01',
	// 			SubscriptionNumber: 'A-S12345678',
	// 		},
	// 	]);
	// });

	// test('should return an empty array if no records are found', async () => {
	// 	(doQuery as jest.Mock).mockResolvedValue({ records: [] });

	// 	const zuoraClient = await ZuoraClient.create(stage);
	// 	const result = await getPastInvoiceItems(
	// 		zuoraClient,
	// 		'A-S12345678',
	// 		'2022-01-01',
	// 	);

	// 	expect(result).toEqual([]);
	// });

	test('should throw an error if doQuery fails', async () => {
		(doQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));

		const zuoraClient = await ZuoraClient.create(stage);

		await expect(
			getPastInvoiceItems(zuoraClient, 'A-S12345678', '2022-01-01'),
		).rejects.toThrow('Query failed');
	});
});
