import { DataExtensionNames, sendEmail } from '@modules/email/email';
import { BrazeEmailSender } from '../../src/adapters/brazeEmailSender';
import type { VoucherRecord } from '../../src/domain/schemas';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return -- jest.requireActual returns any
jest.mock('@modules/email/email', () => ({
	...jest.requireActual('@modules/email/email'),
	sendEmail: jest.fn().mockResolvedValue({}),
}));

const mockSendEmail = sendEmail as jest.MockedFunction<typeof sendEmail>;

const testRecord: VoucherRecord = {
	identityId: 'user-123',
	requestTimestamp: '2026-01-15T10:00:00.000Z',
	email: 'test@example.com',
	voucherType: 'DIGITAL_REWARD',
	voucherCode: 'VOUCHER-ABC',
	expiryDate: '2026-12-31',
	status: 'SUCCESS',
};

beforeEach(() => {
	mockSendEmail.mockClear();
});

describe('BrazeEmailSender', () => {
	it('sends a Braze email with the correct structure from a VoucherRecord', async () => {
		const sender = new BrazeEmailSender('CODE');

		await sender.sendVoucherConfirmation(testRecord);

		expect(mockSendEmail).toHaveBeenCalledTimes(1);
		expect(mockSendEmail).toHaveBeenCalledWith('CODE', {
			DataExtensionName: DataExtensionNames.imovoVoucherReward,
			IdentityUserId: 'user-123',
			To: {
				Address: 'test@example.com',
				ContactAttributes: {
					SubscriberAttributes: {
						voucher_code: 'VOUCHER-ABC',
						expiry_date: '2026-12-31',
						voucher_type: 'DIGITAL_REWARD',
					},
				},
			},
		});
	});

	it('passes the correct stage to sendEmail', async () => {
		const sender = new BrazeEmailSender('PROD');

		await sender.sendVoucherConfirmation(testRecord);

		expect(mockSendEmail).toHaveBeenCalledWith('PROD', expect.any(Object));
	});

	it('propagates errors from sendEmail', async () => {
		mockSendEmail.mockRejectedValueOnce(new Error('SQS queue error'));

		const sender = new BrazeEmailSender('CODE');

		await expect(sender.sendVoucherConfirmation(testRecord)).rejects.toThrow(
			'SQS queue error',
		);
	});
});
