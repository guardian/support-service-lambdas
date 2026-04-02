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
	id: 'pm-ccrt-id',
	type: 'CreditCardReferenceTransaction',
	tokenId: 'tok_stripe_123',
	secondTokenId: 'cus_stripe_456',
};

const paypalPaymentMethodById = {
	id: 'pm-pp-id',
	type: 'PayPalNativeEC',
	BAID: 'BAID-paypal-123',
	email: 'john@example.com',
};

const bankTransferPaymentMethodById = {
	id: 'pm-bt-id',
	type: 'Bacs',
	accountNumber: '****6819',
	bankCode: '601613',
	accountHolderInfo: { accountHolderName: 'John Doe' },
	mandateInfo: {
		mandateId: 'GC-MANDATE-001',
		mandateReason: null,
		mandateStatus: null,
	},
};

const creditCardPaymentMethodById = {
	id: 'pm-cc-id',
	type: 'CreditCard',
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
			const mockPost = jest.fn().mockResolvedValueOnce({ id: 'new-pm-id' });
			const client = buildMockZuoraClient(mockGet, mockPost);

			const result = await clonePaymentMethod(client, {
				id: 'pm-bt-id',
				requiresCloning: true,
			});

			expect(result).toEqual({ hpmCreditCardPaymentMethodId: 'new-pm-id' });
			const [path, body] = mockPost.mock.calls[0] as [string, string];
			expect(path).toBe('/v1/payment-methods');
			const pm = JSON.parse(body) as Record<string, unknown>;
			expect(pm.type).toBe('Bacs');
			expect(pm.accountKey).toBeUndefined();
			expect((pm.mandateInfo as Record<string, string>).mandateId).toBe(
				'GC-MANDATE-001',
			);
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
				id: 'pm-unknown-id',
				type: 'SomeUnknownType',
			});
			const client = buildMockZuoraClient(mockGet, jest.fn());

			await expect(
				clonePaymentMethod(client, {
					id: 'pm-unknown-id',
					requiresCloning: true,
				}),
			).rejects.toThrow('Unsupported payment method type for cloning');
		});

		it.each([
			[
				'accountNumber',
				{ ...bankTransferPaymentMethodById, accountNumber: undefined },
			],
			['bankCode', { ...bankTransferPaymentMethodById, bankCode: undefined }],
			[
				'accountHolderInfo.accountHolderName',
				{
					...bankTransferPaymentMethodById,
					accountHolderInfo: { accountHolderName: null },
				},
			],
			[
				'mandateInfo.mandateId',
				{
					...bankTransferPaymentMethodById,
					mandateInfo: { mandateId: null },
				},
			],
		])(
			'throws a meaningful error when Bacs payment method is missing %s',
			async (_field, pm) => {
				const mockGet = jest.fn().mockResolvedValueOnce(pm);
				const client = buildMockZuoraClient(mockGet, jest.fn());

				await expect(
					clonePaymentMethod(client, { id: 'pm-bt-id', requiresCloning: true }),
				).rejects.toThrow(`Bacs payment method pm-bt-id is missing ${_field}`);
			},
		);
	});
});
