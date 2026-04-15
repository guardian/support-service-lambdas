import { clonePaymentMethod } from '@modules/zuora/createSubscription/clonePaymentMethod';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

const buildMockZuoraClient = (
	mockGet: jest.Mock,
	mockPost: jest.Mock,
): jest.Mocked<ZuoraClient> =>
	({
		get: mockGet,
		post: mockPost,
		put: jest.fn(),
		delete: jest.fn(),
		fetch: jest.fn(),
	}) as unknown as jest.Mocked<ZuoraClient>;

const ccrtPaymentMethodById = {
	Id: 'pm-ccrt-id',
	Type: 'CreditCardReferenceTransaction',
	Country: 'GB',
	TokenId: 'tok_stripe_123',
	SecondTokenId: 'cus_stripe_456',
};

const paypalPaymentMethodById = {
	Id: 'pm-pp-id',
	Type: 'PayPalNativeEC',
};

const bankTransferPaymentMethodById = {
	Id: 'pm-bt-id',
	Type: 'BankTransfer',
	Country: 'GB',
	BankTransferType: 'BACS',
	BankTransferAccountNumberMask: '****6819',
	BankCode: '601613',
	BankTransferAccountName: 'John Doe',
	MandateID: 'GC-MANDATE-001',
};

const creditCardPaymentMethodById = {
	Id: 'pm-cc-id',
	Type: 'CreditCard',
};

describe('clonePaymentMethod', () => {
	describe('requiresCloning: false', () => {
		it('returns the existing id without making any API calls', async () => {
			const mockGet = jest.fn();
			const client = buildMockZuoraClient(mockGet, jest.fn());

			const result = await clonePaymentMethod(client, {
				id: 'pm-existing-id',
				requiresCloning: false,
			});

			expect(result).toEqual({
				hpmCreditCardPaymentMethodId: 'pm-existing-id',
			});
			expect(mockGet).not.toHaveBeenCalled();
		});
	});

	describe('requiresCloning: true', () => {
		it('returns ClonedCreditCardReferenceTransaction for CreditCardReferenceTransaction', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(ccrtPaymentMethodById);
			const client = buildMockZuoraClient(mockGet, jest.fn());

			const result = await clonePaymentMethod(client, {
				id: 'pm-ccrt-id',
				requiresCloning: true,
			});

			expect(result).toEqual({
				paymentMethod: {
					type: 'CreditCardReferenceTransaction',
					tokenId: 'tok_stripe_123',
					secondTokenId: 'cus_stripe_456',
				},
			});
		});

		it('creates an orphan BankTransfer payment method and returns its id', async () => {
			const mockGet = jest
				.fn()
				.mockResolvedValueOnce(bankTransferPaymentMethodById);
			const mockPost = jest.fn().mockResolvedValueOnce({ Id: 'new-pm-id' });
			const client = buildMockZuoraClient(mockGet, mockPost);

			const result = await clonePaymentMethod(client, {
				id: 'pm-bt-id',
				requiresCloning: true,
			});

			expect(result).toEqual({ hpmCreditCardPaymentMethodId: 'new-pm-id' });
			const [path, body] = mockPost.mock.calls[0] as [string, string];
			expect(path).toBe('/v1/object/payment-method');
			const pm = JSON.parse(body) as Record<string, unknown>;
			expect(pm.Type).toBe('BankTransfer');
			expect(pm.AccountKey).toBeUndefined();
			expect(pm.MandateID).toBe('GC-MANDATE-001');
		});

		it('throws for PayPal payment method', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce(paypalPaymentMethodById);
			const client = buildMockZuoraClient(mockGet, jest.fn());

			await expect(
				clonePaymentMethod(client, { id: 'pm-pp-id', requiresCloning: true }),
			).rejects.toThrow('Unsupported payment method type for cloning');
		});

		it('throws for CreditCard payment method', async () => {
			const mockGet = jest
				.fn()
				.mockResolvedValueOnce(creditCardPaymentMethodById);
			const client = buildMockZuoraClient(mockGet, jest.fn());

			await expect(
				clonePaymentMethod(client, { id: 'pm-cc-id', requiresCloning: true }),
			).rejects.toThrow('Unsupported payment method type for cloning');
		});

		it('throws for unknown payment method type', async () => {
			const mockGet = jest.fn().mockResolvedValueOnce({
				Id: 'pm-unknown-id',
				Type: 'SomeUnknownType',
			});
			const client = buildMockZuoraClient(mockGet, jest.fn());

			await expect(
				clonePaymentMethod(client, {
					id: 'pm-unknown-id',
					requiresCloning: true,
				}),
			).rejects.toThrow('Unsupported payment method type for cloning');
		});
	});
});
