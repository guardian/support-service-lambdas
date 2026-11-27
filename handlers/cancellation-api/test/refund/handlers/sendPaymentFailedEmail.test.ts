import { sendEmail } from '@modules/email/email';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { handler } from '../../../src/refund/handlers/sendPaymentFailedEmail';
import { PermanentError } from '../../../src/refund/permanentError';
import { getPaymentFailedEmailData } from '../../../src/refund/zuora/paymentFailedEmailData';

jest.mock('@modules/email/email', () => ({
	...jest.requireActual<object>('@modules/email/email'),
	sendEmail: jest.fn(),
}));
jest.mock('@modules/stage');
jest.mock('@modules/zuora/zuoraClient', () => ({
	ZuoraClient: { create: jest.fn() },
}));
const createZuoraClient = jest.mocked(
	// eslint-disable-next-line @typescript-eslint/unbound-method -- static factory
	ZuoraClient.create,
);
jest.mock('../../../src/refund/zuora/paymentFailedEmailData');

const zuoraClient = {} as ZuoraClient;
const event = {
	subscriptionNumber: 'A-S00123456',
	accountNumber: 'A00123456',
	invoiceId: 'invoice-1',
	paymentId: 'payment-1',
};

describe('sendPaymentFailedEmail handler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		jest.mocked(stageFromEnvironment).mockReturnValue('CODE');
		createZuoraClient.mockResolvedValue(zuoraClient);
		jest.mocked(getPaymentFailedEmailData).mockResolvedValue({
			subscriptionNumber: 'A-S00123456',
			unpaidInvoiceId: 'invoice-1',
			sfContactId: 'sf-contact-1',
			emailAddress: 'test.user@thegulocal.com',
			firstName: 'Test',
			lastName: 'User',
			paymentMethod: {
				type: 'BankTransfer',
				cardType: undefined,
				cardExpiryMonth: undefined,
				cardExpiryYear: undefined,
			},
			invoiceItems: [
				{
					ProductName: 'Supporter Plus',
					ChargeAmount: 12,
					ServiceStartDate: '2026-11-01',
					ServiceEndDate: '2026-11-30',
				},
			],
		});
	});

	it('reads the email data for the unpaid invoice and failed payment, and sends it for the stage', async () => {
		await handler(event);

		expect(getPaymentFailedEmailData).toHaveBeenCalledWith(zuoraClient, {
			subscriptionNumber: 'A-S00123456',
			accountNumber: 'A00123456',
			unpaidInvoiceId: 'invoice-1',
			failedPaymentId: 'payment-1',
		});
		expect(sendEmail).toHaveBeenCalledWith(
			'CODE',
			expect.objectContaining({
				DataExtensionName: 'cancelled-payment-email',
				SfContactId: 'sf-contact-1',
			}),
			expect.any(Function),
		);
	});

	it('fails if the email can’t be queued, so the step is retried', async () => {
		jest.mocked(sendEmail).mockRejectedValue(new Error('SQS unavailable'));

		await expect(handler(event)).rejects.toThrow('SQS unavailable');
	});

	it('fails permanently without a payment id', async () => {
		await expect(
			handler({ ...event, paymentId: undefined }),
		).rejects.toBeInstanceOf(PermanentError);
		expect(sendEmail).not.toHaveBeenCalled();
	});
});
