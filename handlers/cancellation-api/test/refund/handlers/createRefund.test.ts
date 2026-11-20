import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	createRefund,
	getRefundablePaymentId,
} from '../../../src/refund/handlers/createRefund';
import { PermanentError } from '../../../src/refund/permanentError';
import {
	createRefund as createZuoraRefund,
	getRefund,
	getRefundsByComment,
} from '../../../src/refund/zuora/refund';

jest.mock('../../../src/refund/zuora/refund');

const zuoraClient = {} as ZuoraClient;
const input = {
	refundKey: 'A-S00123456-O-00123456',
	paymentId: 'payment-1',
	refundAmount: 12,
};

describe('createRefund', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('refunds the payment with the refund key as its comment', async () => {
		jest.mocked(getRefundsByComment).mockResolvedValue([]);
		jest.mocked(createZuoraRefund).mockResolvedValue('refund-1');
		jest
			.mocked(getRefund)
			.mockResolvedValue({ id: 'refund-1', amount: 12, status: 'Processed' });

		expect(await createRefund(zuoraClient, input)).toEqual({
			refundId: 'refund-1',
		});
		expect(createZuoraRefund).toHaveBeenCalledWith({
			zuoraClient,
			paymentId: 'payment-1',
			amount: 12,
			comment: 'A-S00123456-O-00123456',
		});
	});

	it('does not refund again on a re-run', async () => {
		jest
			.mocked(getRefundsByComment)
			.mockResolvedValue([{ id: 'refund-1', amount: 12, status: 'Processed' }]);

		expect(await createRefund(zuoraClient, input)).toEqual({
			refundId: 'refund-1',
		});
		expect(createZuoraRefund).not.toHaveBeenCalled();
	});

	it('fails without refunding again if the existing refund is not processed yet', async () => {
		jest
			.mocked(getRefundsByComment)
			.mockResolvedValue([
				{ id: 'refund-1', amount: 12, status: 'Processing' },
			]);

		const error: unknown = await createRefund(zuoraClient, input).catch(
			(e: unknown) => e,
		);
		expect(error).toEqual(new Error('Refund refund-1 is still processing'));
		expect(error).not.toBeInstanceOf(PermanentError);
		expect(createZuoraRefund).not.toHaveBeenCalled();
	});

	it('fails permanently if the refund has errored', async () => {
		jest
			.mocked(getRefundsByComment)
			.mockResolvedValue([{ id: 'refund-1', amount: 12, status: 'Error' }]);

		await expect(createRefund(zuoraClient, input)).rejects.toThrow(
			new PermanentError(
				'Refund refund-1 has status Error, expected Processed',
			),
		);
	});

	it('fails if the existing refund is for a different amount', async () => {
		jest
			.mocked(getRefundsByComment)
			.mockResolvedValue([{ id: 'refund-1', amount: 5, status: 'Processed' }]);

		await expect(createRefund(zuoraClient, input)).rejects.toThrow(
			'Refund refund-1 is for 5, expected 12',
		);
	});
});

describe('getRefundablePaymentId', () => {
	const refundable = {
		invoiceId: 'invoice-1',
		paymentId: 'payment-1',
		paymentAmount: 12,
		refundAmount: 12,
	};

	it('returns the payment when it covers the refund', () => {
		expect(getRefundablePaymentId(refundable)).toBe('payment-1');
	});

	it('fails permanently if the invoice has no payment', () => {
		expect(() =>
			getRefundablePaymentId({ invoiceId: 'invoice-1', refundAmount: 12 }),
		).toThrow(
			new PermanentError(
				'Invoice invoice-1 has no payment to refund, it may have been paid from credit balance',
			),
		);
	});

	it('fails permanently if the refund is more than the payment', () => {
		expect(() =>
			getRefundablePaymentId({ ...refundable, paymentAmount: 11.99 }),
		).toThrow(
			new PermanentError(
				'Refund of 12 is more than payment payment-1 of 11.99 for invoice invoice-1, the rest may have been paid from credit balance',
			),
		);
	});
});
