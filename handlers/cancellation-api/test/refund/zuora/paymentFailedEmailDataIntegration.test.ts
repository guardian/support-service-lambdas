/**
 * Reading the payment failed email fields from Zuora CODE. Doesn't send the email.
 *
 * Run with: STAGE=CODE AWS_PROFILE=membership pnpm it-test paymentFailedEmailDataIntegration
 *
 * @group integration
 */
import { z } from 'zod';
import { deleteAccount } from '@modules/zuora/account';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createContribution } from '../../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { getLatestPositiveInvoiceId } from '../../../src/refund/latestInvoice';
import { buildPaymentFailedEmail } from '../../../src/refund/paymentFailedEmail';
import { getPaymentFailedEmailData } from '../../../src/refund/zuora/paymentFailedEmailData';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

const createdAccountNumbers: string[] = [];

describe('getPaymentFailedEmailData', () => {
	afterAll(async () => {
		const zuoraClient = await ZuoraClient.create('CODE');
		await Promise.all(
			createdAccountNumbers.map((accountNumber) =>
				deleteAccount(zuoraClient, accountNumber),
			),
		);
	});

	it.each(['directDebit', 'visaCard'] as const)(
		'reads the email fields for a %s subscription',
		async (paymentMethod) => {
			const zuoraClient = await ZuoraClient.create('CODE');
			const subscriptionNumber = subscriptionNumberSchema.parse(
				await createContribution(zuoraClient, { paymentMethod }),
			);
			const { accountNumber } = await getSubscription(
				zuoraClient,
				subscriptionNumber,
				z.object({ accountNumber: z.string() }),
			);
			createdAccountNumbers.push(accountNumber);
			const unpaidInvoiceId = getLatestPositiveInvoiceId(
				await getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
			);

			const email = buildPaymentFailedEmail(
				await getPaymentFailedEmailData(zuoraClient, {
					subscriptionNumber,
					accountNumber,
					unpaidInvoiceId,
				}),
			);

			expect(email.To.ContactAttributes.SubscriberAttributes).toMatchObject({
				subscriber_id: subscriptionNumber,
				product: 'Contributor',
				payment_method:
					paymentMethod === 'directDebit'
						? 'BankTransfer'
						: 'CreditCardReferenceTransaction',
				invoiceId: unpaidInvoiceId,
			});
		},
		120_000,
	);
});
