/**
 * Generating the negative invoice for a cancellation, against Zuora CODE.
 *
 * Run with: STAGE=CODE AWS_PROFILE=membership pnpm it-test negativeInvoiceIntegration
 *
 * @group integration
 */
import dayjs from 'dayjs';
import { z } from 'zod';
import { deleteAccount } from '@modules/zuora/account';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { buildCancellationOrderRequest } from '@modules/zuora/orders/cancelSubscription';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createContribution } from '../../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { toPence } from '../../../src/refund/money';
import { getInvoiceStatus } from '../../../src/refund/zuora/invoiceGeneration';
import { generateAndPostNegativeInvoice } from '../../../src/refund/zuora/negativeInvoice';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

describe('generateAndPostNegativeInvoice', () => {
	let accountNumber: string | undefined;

	afterAll(async () => {
		if (accountNumber !== undefined) {
			const zuoraClient = await ZuoraClient.create('CODE');
			await deleteAccount(zuoraClient, accountNumber);
		}
	});

	it('generates and posts the negative invoice once, however many times it runs', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');
		const today = dayjs();
		const subscriptionNumber = subscriptionNumberSchema.parse(
			await createContribution(zuoraClient),
		);
		({ accountNumber } = await getSubscription(
			zuoraClient,
			subscriptionNumber,
			z.object({ accountNumber: z.string() }),
		));
		// the cancellation endpoint doesn't run billing
		await executeOrderRequest(
			zuoraClient,
			{
				...buildCancellationOrderRequest({
					accountNumber,
					subscriptionNumber,
					orderDate: today,
					cancellationEffectiveDate: today,
				}),
				processingOptions: { runBilling: false, collectPayment: false },
			},
			z.object({ orderNumber: z.string() }),
		);
		const input = { subscriptionNumber, targetDate: today, today };

		const first = await generateAndPostNegativeInvoice(zuoraClient, input);
		const second = await generateAndPostNegativeInvoice(zuoraClient, input);

		expect(second).toEqual(first);
		expect(await getInvoiceStatus(zuoraClient, first)).toBe('Posted');
		const invoiceItems = await getSubscriptionInvoiceItems(
			zuoraClient,
			subscriptionNumber,
		);
		expect(invoiceItems.filter(({ InvoiceId }) => InvoiceId === first)).toEqual(
			[expect.objectContaining({ ChargeAmount: toPence(-100) })],
		);
	}, 300_000);
});
