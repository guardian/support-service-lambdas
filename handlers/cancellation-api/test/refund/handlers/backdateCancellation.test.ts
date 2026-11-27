import dayjs from 'dayjs';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { backdateCancellation } from '../../../src/refund/handlers/backdateCancellation';
import {
	deleteOrder,
	orderExists,
} from '../../../src/refund/zuora/cancellationOrder';
import { getInvoiceServiceStartDate } from '../../../src/refund/zuora/invoiceServiceStartDate';
import { generateAndPostNegativeInvoice } from '../../../src/refund/zuora/negativeInvoice';
import { getSubscriptionCancellation } from '../../../src/refund/zuora/subscriptionCancellation';

jest.mock('@modules/zuora/orders/orderRequests');
jest.mock('../../../src/refund/zuora/cancellationOrder');
jest.mock('../../../src/refund/zuora/invoiceServiceStartDate');
jest.mock('../../../src/refund/zuora/subscriptionCancellation');
jest.mock('../../../src/refund/zuora/negativeInvoice');

const zuoraClient = {} as ZuoraClient;
const cancellationReasons = {
	UserCancellationReason__c: 'mma_other',
	CancellationReason__c: 'Customer',
};
const input = {
	subscriptionNumber: subscriptionNumberSchema.parse('A-S00123456'),
	accountNumber: 'A00123456',
	cancellationOrderNumber: 'O-00123456',
	unpaidInvoiceId: 'unpaid',
	cancellationReasons,
};
const today = dayjs('2026-11-19');

describe('backdateCancellation', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest
			.mocked(getInvoiceServiceStartDate)
			.mockResolvedValue(dayjs('2026-10-01'));
		jest.mocked(generateAndPostNegativeInvoice).mockResolvedValue('credit');
	});

	it('deletes the order and re-cancels from the unpaid period start with the reasons', async () => {
		jest.mocked(orderExists).mockResolvedValue(true);
		jest.mocked(getSubscriptionCancellation).mockResolvedValue({
			status: 'Cancelled',
			subscriptionEndDate: '2026-11-01',
		});

		expect(await backdateCancellation(zuoraClient, input, today)).toEqual({
			backdated: true,
			creditInvoiceId: 'credit',
		});
		expect(deleteOrder).toHaveBeenCalledWith(zuoraClient, 'O-00123456');
		const [, request] = jest.mocked(executeOrderRequest).mock.calls[0] ?? [];
		expect(request?.processingOptions.runBilling).toBe(false);
		expect(request?.subscriptions[0]).toMatchObject({
			subscriptionNumber: 'A-S00123456',
			customFields: cancellationReasons,
			orderActions: [
				{
					cancelSubscription: { cancellationEffectiveDate: '2026-10-01' },
				},
			],
		});
	});

	it('only re-cancels on a re-run after the order was deleted', async () => {
		jest.mocked(orderExists).mockResolvedValue(false);
		jest
			.mocked(getSubscriptionCancellation)
			.mockResolvedValue({ status: 'Active' });

		expect(await backdateCancellation(zuoraClient, input, today)).toEqual({
			backdated: true,
			creditInvoiceId: 'credit',
		});
		expect(deleteOrder).not.toHaveBeenCalled();
		expect(executeOrderRequest).toHaveBeenCalledTimes(1);
	});

	it('changes nothing when the cancellation already covers the unpaid period', async () => {
		jest.mocked(orderExists).mockResolvedValue(true);
		jest.mocked(getSubscriptionCancellation).mockResolvedValue({
			status: 'Cancelled',
			subscriptionEndDate: '2026-10-01',
		});

		expect(await backdateCancellation(zuoraClient, input, today)).toEqual({
			backdated: false,
			creditInvoiceId: 'credit',
		});
		expect(deleteOrder).not.toHaveBeenCalled();
		expect(executeOrderRequest).not.toHaveBeenCalled();
		expect(generateAndPostNegativeInvoice).toHaveBeenCalledWith(zuoraClient, {
			subscriptionNumber: 'A-S00123456',
			targetDate: dayjs('2026-10-01'),
			today,
		});
	});
});
