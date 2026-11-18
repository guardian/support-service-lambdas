import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createRefund } from '../../../src/refund/handlers/createRefund';
import {
	createRefund as createZuoraRefund,
	getRefund,
	getRefundsByComment,
} from '../../../src/refund/zuora/refund';

jest.mock('../../../src/refund/zuora/refund');

const zuoraClient = {} as ZuoraClient;
const input = {
	subscriptionNumber: subscriptionNumberSchema.parse('A-S00123456'),
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

		await expect(createRefund(zuoraClient, input)).rejects.toThrow(
			'Refund refund-1 has status Processing, expected Processed',
		);
		expect(createZuoraRefund).not.toHaveBeenCalled();
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
