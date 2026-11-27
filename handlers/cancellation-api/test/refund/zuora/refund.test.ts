import { doQuery } from '@modules/zuora/query';
import { doRefund } from '@modules/zuora/refund';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PermanentError } from '../../../src/refund/permanentError';
import {
	createRefund,
	getRefund,
	getRefundsByComment,
} from '../../../src/refund/zuora/refund';

jest.mock('@modules/zuora/query');
jest.mock('@modules/zuora/refund');

const get = jest.fn();
const zuoraClient = { get } as unknown as ZuoraClient;

describe('createRefund', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('refunds the payment electronically with the comment and returns the refund ID', async () => {
		jest.mocked(doRefund).mockResolvedValue({ Success: true, Id: 'refund-1' });

		expect(
			await createRefund({
				zuoraClient,
				paymentId: 'payment-1',
				amount: 12,
				comment: 'refund-key',
			}),
		).toBe('refund-1');
		expect(jest.mocked(doRefund).mock.calls[0]?.[1]).toEqual(
			JSON.stringify({
				Amount: 12,
				Comment: 'refund-key',
				PaymentId: 'payment-1',
				Type: 'Electronic',
			}),
		);
	});
});

describe('getRefund', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('maps the refund', async () => {
		get.mockResolvedValue({ Id: 'refund-1', Amount: 12, Status: 'Processed' });

		expect(await getRefund(zuoraClient, 'refund-1')).toEqual({
			id: 'refund-1',
			amount: 12,
			status: 'Processed',
		});
		expect(get).toHaveBeenCalledWith(
			'/v1/object/refund/refund-1',
			expect.anything(),
		);
	});
});

describe('getRefundsByComment', () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('maps the refunds with the comment', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: true,
			records: [{ Id: 'refund-1', Amount: 12, Status: 'Processed' }],
		});

		expect(await getRefundsByComment(zuoraClient, 'refund-key')).toEqual([
			{ id: 'refund-1', amount: 12, status: 'Processed' },
		]);
		expect(jest.mocked(doQuery).mock.calls[0]?.[1]).toBe(
			"select Id, Amount, Status from Refund where Comment = 'refund-key'",
		);
	});

	it('returns no refunds if there are none with the comment', async () => {
		jest.mocked(doQuery).mockResolvedValue({ done: true, records: [] });

		expect(await getRefundsByComment(zuoraClient, 'refund-key')).toEqual([]);
	});

	it('fails permanently if there are more refunds than one page', async () => {
		jest.mocked(doQuery).mockResolvedValue({
			done: false,
			records: [{ Id: 'refund-1', Amount: 12, Status: 'Processed' }],
		});

		await expect(
			getRefundsByComment(zuoraClient, 'refund-key'),
		).rejects.toThrow(
			new PermanentError('Too many refunds with comment refund-key'),
		);
	});
});
