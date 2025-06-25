import * as doCreditBalanceRefundModule from '@modules/zuora/doCreditBalanceRefund';
import * as zuoraClientModule from '@modules/zuora/zuoraClient';
import { handler } from '../../src/handlers/doCreditBalanceRefund';
import type { DoCreditBalanceRefundInput } from '../../src/handlers/doCreditBalanceRefund';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('@modules/zuora/doCreditBalanceRefund');

const mockZuoraClient = { fake: 'client' };
const mockDoCreditBalanceRefund =
	doCreditBalanceRefundModule.doCreditBalanceRefund as jest.Mock;
const mockCreateZuoraClient = zuoraClientModule.ZuoraClient.create as jest.Mock;

beforeEach(() => {
	jest.clearAllMocks();
	mockCreateZuoraClient.mockResolvedValue(mockZuoraClient);
});
jest.mock('@modules/stage', () => ({
	stageFromEnvironment: jest.fn().mockReturnValue('PROD'),
}));
const baseEvent: DoCreditBalanceRefundInput = {
	invoiceId: 'inv-123',
	accountId: 'acc-456',
	invoiceNumber: 'INV-789',
	invoiceBalance: -100,
	hasActiveSub: true,
	applyCreditToAccountBalanceAttempt: { Success: true },
	hasActivePaymentMethod: true,
	activePaymentMethods: [
		{ id: 'pm-1', status: 'Active', type: 'CreditCard', isDefault: true },
		{ id: 'pm-2', status: 'Active', type: 'PayPal', isDefault: false },
	],
};

it('should process a successful credit balance refund', async () => {
	mockDoCreditBalanceRefund.mockResolvedValue({
		Success: true,
		Id: 'refund-1',
	});

	const result = await handler(baseEvent);

	expect(mockCreateZuoraClient).toHaveBeenCalled();
	expect(mockDoCreditBalanceRefund).toHaveBeenCalledWith(
		mockZuoraClient,
		expect.stringContaining('"AccountId":"acc-456"'),
	);

	expect(result).toHaveProperty('creditBalanceRefundAttempt');
	expect(result.creditBalanceRefundAttempt.Success).toBe(true);
	expect(result.creditBalanceRefundAttempt.paymentMethod).toEqual(
		baseEvent.activePaymentMethods?.[0],
	);
});

// it('should use the first payment method if no default is set', async () => {
// 	const event = {
// 		...baseEvent,
// 		activePaymentMethods: [
// 			{ id: 'pm-1', status: 'Active', type: 'CreditCard', isDefault: false },
// 			{ id: 'pm-2', status: 'Active', type: 'PayPal', isDefault: false },
// 		],
// 	};
// 	mockDoCreditBalanceRefund.mockResolvedValue({
// 		Success: true,
// 		Id: 'refund-2',
// 	});

// 	const result = await handler(event);

// 	if ('creditBalanceRefundAttempt' in result) {
// 		expect(result.creditBalanceRefundAttempt.paymentMethod).toEqual(
// 			event.activePaymentMethods[0],
// 		);
// 	} else {
// 		throw new Error('Expected creditBalanceRefundAttempt in result');
// 	}
// });

// it('should return error if no active payment method is found', async () => {
// 	const event = { ...baseEvent, activePaymentMethods: [] };
// 	const result = await handler(event);

// 	expect(result.applyCreditToAccountBalanceAttempt).toBe('Error');
// 	if ('errorDetail' in result) {
// 		expect(result.errorDetail).toMatch(/No active payment method found/);
// 	} else {
// 		throw new Error('Expected errorDetail in result');
// 	}
// });

// it('should return error if schema validation fails', async () => {
// 	const invalidEvent = { ...baseEvent, invoiceBalance: 'not-a-number' as any };
// 	const result = await handler(invalidEvent as any);

// 	expect(result.applyCreditToAccountBalanceAttempt).toBe('Error');
// 	if ('errorDetail' in result) {
// 		expect(result.errorDetail).toMatch(/invoiceBalance/);
// 	} else {
// 		throw new Error('Expected errorDetail in result');
// 	}
// });

// it('should handle doCreditBalanceRefund throwing an error', async () => {
// 	mockDoCreditBalanceRefund.mockRejectedValue(new Error('Refund failed'));

// 	const result = await handler(baseEvent);

// 	expect(result.applyCreditToAccountBalanceAttempt).toBe('Error');
// 	if ('errorDetail' in result) {
// 		expect(result.errorDetail).toBe('Refund failed');
// 	} else {
// 		throw new Error('Expected errorDetail in result');
// 	}
// });

// it('should format RefundDate as today', async () => {
// 	mockDoCreditBalanceRefund.mockResolvedValue({ Success: true });
// 	const spy = jest.spyOn(dayjs.prototype, 'format');
// 	await handler(baseEvent);
// 	expect(spy).toHaveBeenCalledWith('YYYY-MM-DD');
// 	spy.mockRestore();
// });
