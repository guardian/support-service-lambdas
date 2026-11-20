/**
 * Backdating a cancellation after a failed Direct Debit, against Zuora CODE.
 *
 * Run with: STAGE=CODE AWS_PROFILE=membership pnpm it-test backdateCancellationIntegration
 *
 * @group integration
 */
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { z } from 'zod';
import { getIfDefined } from '@modules/nullAndUndefined';
import { deleteAccount } from '@modules/zuora/account';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { subscriptionNumberSchema } from '@modules/zuora/identifiers';
import { getInvoice } from '@modules/zuora/invoice';
import { buildCancellationOrderRequest } from '@modules/zuora/orders/cancelSubscription';
import { executeOrderRequest } from '@modules/zuora/orders/orderRequests';
import { rejectPayment } from '@modules/zuora/payment';
import { doQuery } from '@modules/zuora/query';
import { getSubscription } from '@modules/zuora/subscription';
import { voidSchema } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { createContribution } from '../../../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { backdateCancellation } from '../../../src/refund/handlers/backdateCancellation';
import { getCancellationReason } from '../../../src/refund/handlers/getCancellationReason';
import { getLatestPositiveInvoiceId } from '../../../src/refund/latestInvoice';
import { deleteOrder } from '../../../src/refund/zuora/cancellationOrder';
import { getSubscriptionCancellation } from '../../../src/refund/zuora/subscriptionCancellation';
import { getSubscriptionInvoiceItems } from '../../../src/refund/zuora/subscriptionInvoiceItems';

const testTimeoutMs = 300_000;
const cancellationReasons = {
	UserCancellationReason__c: 'mma_other',
	CancellationReason__c: 'Customer',
};
const createdAccountNumbers: string[] = [];

type TestSubscription = {
	subscriptionNumber: SubscriptionNumber;
	accountNumber: string;
	cancellationOrderNumber: string;
	unpaidInvoiceId: string;
	today: Dayjs;
};

const failedDirectDebitCancelledOn = async (
	zuoraClient: ZuoraClient,
	cancellationDate: (today: Dayjs) => Dayjs,
): Promise<TestSubscription> => {
	const today = dayjs();
	const subscriptionNumber = subscriptionNumberSchema.parse(
		await createContribution(zuoraClient, { paymentMethod: 'directDebit' }),
	);
	const { accountNumber, accountId } = await getSubscription(
		zuoraClient,
		subscriptionNumber,
		z.object({ accountNumber: z.string(), accountId: z.string() }),
	);
	createdAccountNumbers.push(accountNumber);
	const unpaidInvoiceId = getLatestPositiveInvoiceId(
		await getSubscriptionInvoiceItems(zuoraClient, subscriptionNumber),
	);

	const { orderNumber } = await executeOrderRequest(
		zuoraClient,
		buildCancellationOrderRequest({
			accountNumber,
			subscriptionNumber,
			orderDate: today,
			cancellationEffectiveDate: cancellationDate(today),
			// the cancellation endpoint doesn't run billing
			runBilling: false,
		}),
		z.object({ orderNumber: z.string() }),
	);
	// set on the cancelled version, as the cancellation endpoint does
	const { version } = await getSubscription(
		zuoraClient,
		subscriptionNumber,
		z.object({ version: z.number() }),
	);
	await zuoraClient.put(
		`/v1/subscriptions/${subscriptionNumber}/versions/${version}/customFields`,
		JSON.stringify({ customFields: cancellationReasons }),
		voidSchema,
	);

	const { records } = await doQuery(
		zuoraClient,
		`select PaymentNumber from Payment where AccountId = '${accountId}'`,
		z.object({ records: z.array(z.object({ PaymentNumber: z.string() })) }),
	);
	await rejectPayment(
		zuoraClient,
		getIfDefined(records[0]?.PaymentNumber, 'No payment was collected'),
		'payment_failed',
	);

	return {
		subscriptionNumber,
		accountNumber,
		cancellationOrderNumber: orderNumber,
		unpaidInvoiceId,
		today,
	};
};

const backdate = async (zuoraClient: ZuoraClient, sub: TestSubscription) =>
	backdateCancellation(
		zuoraClient,
		{
			...sub,
			cancellationReasons: await getCancellationReason(zuoraClient, sub),
		},
		dayjs(),
	);

const expectCancelledOnWithReasons = async (
	zuoraClient: ZuoraClient,
	sub: TestSubscription,
) => {
	const cancellation = await getSubscriptionCancellation(
		zuoraClient,
		sub.subscriptionNumber,
	);
	expect(cancellation).toMatchObject({
		status: 'Cancelled',
		subscriptionEndDate: sub.today.format('YYYY-MM-DD'),
		...cancellationReasons,
	});
};

const expectCreditsUnpaidInvoice = async (
	zuoraClient: ZuoraClient,
	sub: TestSubscription,
	creditInvoiceId: string,
) => {
	const unpaid = await getInvoice(zuoraClient, sub.unpaidInvoiceId);
	const credit = await getInvoice(zuoraClient, creditInvoiceId);
	expect(credit.amount).toBe(-unpaid.amount);
};

afterAll(async () => {
	const zuoraClient = await ZuoraClient.create('CODE');
	for (const accountNumber of createdAccountNumbers) {
		await deleteAccount(zuoraClient, accountNumber);
	}
}, testTimeoutMs);

describe('backdateCancellation', () => {
	test(
		'moves a later cancellation to the unpaid period start, keeping the reasons, and changes nothing on a re-run',
		async () => {
			const zuoraClient = await ZuoraClient.create('CODE');
			const sub = await failedDirectDebitCancelledOn(zuoraClient, (today) =>
				today.add(1, 'month'),
			);

			const result = await backdate(zuoraClient, sub);

			expect(result.backdated).toBe(true);
			await expectCancelledOnWithReasons(zuoraClient, sub);
			await expectCreditsUnpaidInvoice(
				zuoraClient,
				sub,
				result.creditInvoiceId,
			);
			expect(
				await backdateCancellation(
					zuoraClient,
					{ ...sub, cancellationReasons },
					dayjs(),
				),
			).toEqual(result);
		},
		testTimeoutMs,
	);

	test(
		're-cancels on a re-run after the order was deleted',
		async () => {
			const zuoraClient = await ZuoraClient.create('CODE');
			const sub = await failedDirectDebitCancelledOn(zuoraClient, (today) =>
				today.add(1, 'month'),
			);
			const reasons = await getCancellationReason(zuoraClient, sub);
			await deleteOrder(zuoraClient, sub.cancellationOrderNumber);

			const result = await backdateCancellation(
				zuoraClient,
				{ ...sub, cancellationReasons: reasons },
				dayjs(),
			);

			expect(result.backdated).toBe(true);
			await expectCancelledOnWithReasons(zuoraClient, sub);
			await expectCreditsUnpaidInvoice(
				zuoraClient,
				sub,
				result.creditInvoiceId,
			);
		},
		testTimeoutMs,
	);

	test(
		'leaves a cancellation that already covers the unpaid period',
		async () => {
			const zuoraClient = await ZuoraClient.create('CODE');
			const sub = await failedDirectDebitCancelledOn(
				zuoraClient,
				(today) => today,
			);

			const result = await backdate(zuoraClient, sub);

			expect(result.backdated).toBe(false);
			await expectCancelledOnWithReasons(zuoraClient, sub);
			await expectCreditsUnpaidInvoice(
				zuoraClient,
				sub,
				result.creditInvoiceId,
			);
		},
		testTimeoutMs,
	);
});
