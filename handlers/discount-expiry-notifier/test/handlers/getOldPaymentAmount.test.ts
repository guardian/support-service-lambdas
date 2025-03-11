import type { Stage } from '@modules/stage';
import { doQuery } from '@modules/zuora/query';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { getPastInvoiceItems } from '../../src/handlers/getOldPaymentAmount';

jest.mock('@modules/zuora/query');

const stage: Stage = 'CODE';
describe('getPastInvoiceItems', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	// test('should return records for a given subscription and target date', async () => {
	// 	const records = [{}, {}];
	// 	(doQuery as jest.Mock).mockResolvedValue({ records });

	// 	const zuoraClient = await ZuoraClient.create(stage);
	// 	const result = await getPastInvoiceItems(
	// 		zuoraClient,
	// 		'A-S12345678',
	// 		'2022-01-01',
	// 	);

	// 	expect(result).toEqual(records);
	// });

	// test('should return records for a given subscription and target date', async () => {
	// 	const records = [
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
	// 	];
	// 	(doQuery as jest.Mock).mockResolvedValue({ records });

	// 	const zuoraClient = await ZuoraClient.create(stage);
	// 	const result = await getPastInvoiceItems(
	// 		zuoraClient,
	// 		'A-S12345678',
	// 		'2022-01-01',
	// 	);

	// 	expect(result).toEqual(records);
	// });

	test('should return an empty array if no records are found', async () => {
		const records: unknown[] = [];
		(doQuery as jest.Mock).mockResolvedValue({ records });

		const zuoraClient = await ZuoraClient.create(stage);
		const result = await getPastInvoiceItems(
			zuoraClient,
			'A-S12345678',
			'2022-01-01',
		);

		expect(result).toEqual(records);
	});
});

// test('should throw an error if doQuery fails', async () => {
// 	(doQuery as jest.Mock).mockRejectedValue(new Error('Query failed'));

// 	const zuoraClient = await ZuoraClient.create(stage);

// 	await expect(
// 		getPastInvoiceItems(zuoraClient, 'A-S12345678', '2022-01-01'),
// 	).rejects.toThrow('Query failed');
// });
// });
