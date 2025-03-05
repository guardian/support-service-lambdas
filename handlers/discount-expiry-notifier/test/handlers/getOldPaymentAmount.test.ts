// import type { Stage } from '@modules/stage';
// import { ZuoraClient } from '@modules/zuora/zuoraClient';
// import type { GetOldPaymentAmountInput } from '../../src/handlers/getOldPaymentAmount';
import {
	// calculateTotalAmount,
	// getFutureInvoiceItems,
	getLastPaymentDateBeforeDiscountExpiry,
	// handleTargetDateIsToday,
} from '../../src/handlers/getOldPaymentAmount';

describe('getLastPaymentDateBeforeDiscountExpiry', () => {
	test('should return the date one year before for annual frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2025-03-04',
			'annual',
		);
		expect(result).toBe('2024-03-04');
	});

	test('should return the date three months before for quarter frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2025-03-04',
			'quarter',
		);
		expect(result).toBe('2024-12-04');
	});

	test('should return the date one month before for month frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2025-03-04',
			'month',
		);
		expect(result).toBe('2025-02-04');
	});

	test('should handle leap year correctly for annual frequency', () => {
		const result = getLastPaymentDateBeforeDiscountExpiry(
			'2024-02-29',
			'annual',
		);
		expect(result).toBe('2023-02-28');
	});

	test('should throw an error for invalid payment frequency', () => {
		expect(() => {
			getLastPaymentDateBeforeDiscountExpiry('2025-03-04', 'weekly');
		}).toThrow('Invalid payment frequency');
	});
});

// jest.mock('@modules/zuora/zuoraClient');
// jest.mock('../../src/handlers/getOldPaymentAmount', () => ({
// 	// ...jest.requireActual('../../src/handlers/getOldPaymentAmount'),
// 	getFutureInvoiceItems: jest.fn(),
// 	getPastInvoiceItems: jest.fn(),
// 	calculateTotalAmount: jest.fn(),
// 	handleTargetDateIsToday: jest
// 		.fn()
// 		.mockResolvedValue({ oldPaymentAmount: 110 }), // Mock the return value
// }));

// describe('handleTargetDateIsToday', () => {
// let parsedEvent: GetOldPaymentAmountInput;
// let lastPaymentDateBeforeDiscountExpiry: string;

// beforeEach(() => {
// 	parsedEvent = {
// 		zuoraSubName: 'testSubName',
// 		billingAccountId: 'testBillingAccountId',
// 		firstPaymentDateAfterDiscountExpiry: '2025-03-04',
// 		paymentFrequency: 'annual',
// 	} as GetOldPaymentAmountInput;
// 	lastPaymentDateBeforeDiscountExpiry = '2025-03-03';
// });

// test('should return old payment amount from future invoice items if they exist', async () => {
// 	const stage = 'CODE';
// 	const zuoraClient = await ZuoraClient.create(stage);
// 	console.log('zuoraClient:', zuoraClient);

// 	const futureInvoiceItems = [{ chargeAmount: 100, taxAmount: 10 }];
// 	(getFutureInvoiceItems as jest.Mock).mockResolvedValue(futureInvoiceItems);
// 	(calculateTotalAmount as jest.Mock).mockReturnValue(110);

// 	const result = await handleTargetDateIsToday(
// 		zuoraClient,
// 		parsedEvent,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);
// 	console.log('result:', result);

// 	expect(result.oldPaymentAmount).toBe(110);
// 	expect(getFutureInvoiceItems).toHaveBeenCalledWith(
// 		zuoraClient,
// 		parsedEvent.zuoraSubName,
// 		parsedEvent.billingAccountId,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);
// 	expect(calculateTotalAmount).toHaveBeenCalledWith(futureInvoiceItems);
// });

// test('should return old payment amount from past invoice items if future invoice items do not exist', async () => {
// 	const futureInvoiceItems: any[] = [];
// 	const pastInvoiceItems = [{ chargeAmount: 50, taxAmount: 5 }];
// 	(getFutureInvoiceItems as jest.Mock).mockResolvedValue(futureInvoiceItems);
// 	(getPastInvoiceItems as jest.Mock).mockResolvedValue(pastInvoiceItems);
// 	(calculateTotalAmount as jest.Mock).mockReturnValue(55);

// 	const result = await handleTargetDateIsToday(
// 		zuoraClient,
// 		parsedEvent,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);

// 	expect(result.oldPaymentAmount).toBe(55);
// 	expect(getFutureInvoiceItems).toHaveBeenCalledWith(
// 		zuoraClient,
// 		parsedEvent.zuoraSubName,
// 		parsedEvent.billingAccountId,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);
// 	expect(getPastInvoiceItems).toHaveBeenCalledWith(
// 		zuoraClient,
// 		parsedEvent.zuoraSubName,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);
// 	expect(calculateTotalAmount).toHaveBeenCalledWith(pastInvoiceItems);
// });

// test('should return error detail if no invoice items exist', async () => {
// 	const futureInvoiceItems: any[] = [];
// 	const pastInvoiceItems: any[] = [];
// 	(getFutureInvoiceItems as jest.Mock).mockResolvedValue(futureInvoiceItems);
// 	(getPastInvoiceItems as jest.Mock).mockResolvedValue(pastInvoiceItems);

// 	const result = await handleTargetDateIsToday(
// 		zuoraClient,
// 		parsedEvent,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);

// 	expect(result.errorDetail).toBe('Error getting old payment amount');
// 	expect(getFutureInvoiceItems).toHaveBeenCalledWith(
// 		zuoraClient,
// 		parsedEvent.zuoraSubName,
// 		parsedEvent.billingAccountId,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);
// 	expect(getPastInvoiceItems).toHaveBeenCalledWith(
// 		zuoraClient,
// 		parsedEvent.zuoraSubName,
// 		lastPaymentDateBeforeDiscountExpiry,
// 	);
// });
// });
