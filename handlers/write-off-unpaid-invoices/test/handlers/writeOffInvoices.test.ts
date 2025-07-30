import {
	getInvoice,
	getInvoiceItems,
	creditInvoice,
} from '@modules/zuora/invoice';
import { getAccount } from '@modules/zuora/account';
import { applyCreditToAccountBalance } from '@modules/zuora/creditBalanceAdjustment';
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

jest.mock('@modules/zuora/account', () => ({
	getAccount: jest.fn(),
}));

jest.mock('@modules/zuora/creditBalanceAdjustment', () => ({
	applyCreditToAccountBalance: jest.fn(),
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

		(getInvoice as jest.Mock).mockResolvedValue({
			balance: 35,
			accountNumber: 'ACC123',
		});

		(getAccount as jest.Mock).mockResolvedValue({
			metrics: {
				creditBalance: 0,
				totalInvoiceBalance: 35,
				currency: 'USD',
			},
		});

		(applyCreditToAccountBalance as jest.Mock).mockResolvedValue({
			Success: true,
		});

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
		(getInvoice as jest.Mock).mockResolvedValue({
			balance: -20,
			accountNumber: 'ACC123',
		});

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

		// Should not apply credit balance for negative invoices
		expect(applyCreditToAccountBalance).not.toHaveBeenCalled();

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

	it('applies credit balance when invoice is positive and account has credit', async () => {
		(getInvoice as jest.Mock).mockResolvedValue({
			balance: 50,
			accountNumber: 'ACC123',
		});

		(getAccount as jest.Mock).mockResolvedValue({
			metrics: {
				creditBalance: 30,
				totalInvoiceBalance: 50,
				currency: 'USD',
			},
		});

		await handler(mockEvent);

		// Should apply credit balance adjustment
		expect(applyCreditToAccountBalance).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('"Amount":30'),
		);

		// Should still process remaining balance (50 - 30 = 20) with invoice items
		expect(getInvoiceItems).toHaveBeenCalled();
		expect(creditInvoice).toHaveBeenCalled();
	});

	it('fully balances invoice with credit and skips invoice item adjustments', async () => {
		(getInvoice as jest.Mock).mockResolvedValue({
			balance: 25,
			accountNumber: 'ACC123',
		});

		(getAccount as jest.Mock).mockResolvedValue({
			metrics: {
				creditBalance: 50, // More credit than needed
				totalInvoiceBalance: 25,
				currency: 'USD',
			},
		});

		await handler(mockEvent);

		// Should apply only the needed amount (25)
		expect(applyCreditToAccountBalance).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('"Amount":25'),
		);

		// Should NOT process invoice items since balance is now zero
		expect(getInvoiceItems).not.toHaveBeenCalled();
		expect(creditInvoice).not.toHaveBeenCalled();
	});

	it('skips credit balance application when account has no credit', async () => {
		(getInvoice as jest.Mock).mockResolvedValue({
			balance: 35,
			accountNumber: 'ACC123',
		});

		(getAccount as jest.Mock).mockResolvedValue({
			metrics: {
				creditBalance: 0,
				totalInvoiceBalance: 35,
				currency: 'USD',
			},
		});

		await handler(mockEvent);

		// Should NOT apply credit balance
		expect(applyCreditToAccountBalance).not.toHaveBeenCalled();

		// Should proceed directly to invoice item adjustments
		expect(getInvoiceItems).toHaveBeenCalled();
		expect(creditInvoice).toHaveBeenCalled();
	});

	it('includes correct comment and reason code in credit balance adjustment', async () => {
		(getInvoice as jest.Mock).mockResolvedValue({
			balance: 30,
			accountNumber: 'ACC123',
		});

		(getAccount as jest.Mock).mockResolvedValue({
			metrics: {
				creditBalance: 40,
				totalInvoiceBalance: 30,
				currency: 'USD',
			},
		});

		await handler(mockEvent);

		// Verify the credit balance adjustment was called with correct parameters
		expect(applyCreditToAccountBalance).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('"Amount":30'),
		);
		expect(applyCreditToAccountBalance).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('"Type":"Decrease"'),
		);
		expect(applyCreditToAccountBalance).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('"ReasonCode":"Write-off"'),
		);
		expect(applyCreditToAccountBalance).toHaveBeenCalledWith(
			expect.anything(),
			expect.stringContaining('MMA cancellation process'),
		);
	});
});
