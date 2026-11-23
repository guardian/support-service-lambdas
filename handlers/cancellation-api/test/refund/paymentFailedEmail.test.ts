import type { PaymentFailedEmailData } from '../../src/refund/paymentFailedEmail';
import { buildPaymentFailedEmail } from '../../src/refund/paymentFailedEmail';

const directDebit: PaymentFailedEmailData = {
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
			ProductName: 'Discounts',
			ChargeAmount: -2,
			ServiceStartDate: '2026-11-01',
			ServiceEndDate: '2026-11-30',
		},
		{
			ProductName: 'Supporter Plus',
			ChargeAmount: 12,
			ServiceStartDate: '2026-11-01',
			ServiceEndDate: '2026-11-30',
		},
	],
};

describe('buildPaymentFailedEmail', () => {
	it('builds the cancelled-payment-email from the unpaid charge', () => {
		expect(buildPaymentFailedEmail(directDebit)).toEqual({
			To: {
				Address: 'test.user@thegulocal.com',
				ContactAttributes: {
					SubscriberAttributes: {
						subscriber_id: 'A-S00123456',
						product: 'Supporter Plus',
						payment_method: 'BankTransfer',
						card_type: '',
						card_expiry_date: '',
						first_name: 'Test',
						last_name: 'User',
						invoiceId: 'invoice-1',
						serviceStartDate: '01 November 2026',
						serviceEndDate: '30 November 2026',
					},
				},
			},
			DataExtensionName: 'cancelled-payment-email',
			SfContactId: 'sf-contact-1',
		});
	});

	it('includes the card details when the failed payment was by card', () => {
		const email = buildPaymentFailedEmail({
			...directDebit,
			paymentMethod: {
				type: 'CreditCardReferenceTransaction',
				cardType: 'Visa',
				cardExpiryMonth: 2,
				cardExpiryYear: 2029,
			},
		});

		expect(email.To.ContactAttributes.SubscriberAttributes).toMatchObject({
			payment_method: 'CreditCardReferenceTransaction',
			card_type: 'Visa',
			card_expiry_date: '02/2029',
		});
	});

	it('throws if the account has no email address', () => {
		expect(() =>
			buildPaymentFailedEmail({ ...directDebit, emailAddress: undefined }),
		).toThrow('The account has no email address');
	});

	it('throws if the account has no Salesforce contact', () => {
		expect(() =>
			buildPaymentFailedEmail({ ...directDebit, sfContactId: undefined }),
		).toThrow('The account has no Salesforce contact');
	});

	it('throws if the invoice has no charges', () => {
		expect(() =>
			buildPaymentFailedEmail({
				...directDebit,
				invoiceItems: directDebit.invoiceItems.slice(0, 1),
			}),
		).toThrow('Invoice invoice-1 has no charges');
	});
});
