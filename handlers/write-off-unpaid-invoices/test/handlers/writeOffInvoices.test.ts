import {
	getInvoice,
	getInvoiceItems,
	creditInvoice,
} from '@modules/zuora/invoice';
import {
	handler,
	cancelSourceToCommentMap,
	type CancelSource,
	type LambdaEvent,
} from '../../src/handlers/writeOffInvoices';

jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: {
		create: jest.fn().mockResolvedValue({}),
	},
}));

jest.mock('@modules/zuora/invoice', () => ({
	getInvoice: jest.fn(),
	getInvoiceItems: jest.fn(),
	creditInvoice: jest.fn(),
}));

describe('writeOffInvoices', () => {
	const mockEvent = {
		Items: [
			{
				invoice_id: 'inv123',
				cancel_source: 'MMA' as CancelSource,
			},
		],
	} as LambdaEvent;

	const invoiceItems = [
		{
			id: 'item1',
			availableToCreditAmount: 30,
			taxationItems: {
				data: [
					{ id: 'tax1', availableToCreditAmount: 10 },
					{ id: 'tax2', availableToCreditAmount: 0 },
				],
			},
		},
		{
			id: 'item2',
			availableToCreditAmount: -20,
			taxationItems: { data: [] },
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();

		(getInvoice as jest.Mock).mockResolvedValue({ balance: 35 });

		(getInvoiceItems as jest.Mock).mockResolvedValue({
			invoiceItems,
		});

		process.env = { Stage: 'CODE' };
	});

	it('credits invoice items in correct order until balance is zero', async () => {
		await handler(mockEvent);

		// Expect creditInvoice to be called with sorted positive items: item1 (30), then tax1 (10)
		expect(creditInvoice).toHaveBeenNthCalledWith(
			1,
			expect.anything(), // dayjs timestamp
			expect.anything(), // zuoraClient
			'inv123',
			'item1',
			30,
			'Credit',
			'InvoiceDetail',
			cancelSourceToCommentMap['MMA'],
			'Write-off',
		);

		expect(creditInvoice).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			expect.anything(),
			'inv123',
			'tax1',
			5, // remaining balance = 35 - 30 = 5, so only 5 out of 10 needed
			'Credit',
			'Tax',
			cancelSourceToCommentMap['MMA'],
			'Write-off',
		);

		expect(creditInvoice).toHaveBeenCalledTimes(2);
	});

	it('stops early if balance is already 0', async () => {
		(getInvoice as jest.Mock).mockResolvedValue({ balance: 0 });
		await handler(mockEvent);

		expect(creditInvoice).not.toHaveBeenCalled();
	});

	it('handles negative balances and charges instead of credits', async () => {
		(getInvoice as jest.Mock).mockResolvedValue({ balance: -20 });

		const invoiceItemsNegative = [
			{
				id: 'item3',
				availableToCreditAmount: -15,
				taxationItems: { data: [] },
			},
			{
				id: 'item4',
				availableToCreditAmount: -10,
				taxationItems: { data: [] },
			},
		];

		(getInvoiceItems as jest.Mock).mockResolvedValue({
			invoiceItems: invoiceItemsNegative,
		});

		await handler(mockEvent);

		expect(creditInvoice).toHaveBeenNthCalledWith(
			1,
			expect.anything(),
			expect.anything(),
			'inv123',
			'item3',
			15,
			'Charge',
			'InvoiceDetail',
			cancelSourceToCommentMap['MMA'],
			'Write-off',
		);

		expect(creditInvoice).toHaveBeenNthCalledWith(
			2,
			expect.anything(),
			expect.anything(),
			'inv123',
			'item4',
			5,
			'Charge',
			'InvoiceDetail',
			cancelSourceToCommentMap['MMA'],
			'Write-off',
		);

		expect(creditInvoice).toHaveBeenCalledTimes(2);
	});
});
