import { z } from 'zod';
import type { SubscriptionNumber } from '@modules/zuora/identifiers';
import { doQuery } from '@modules/zuora/query';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type {
	PaymentFailedEmailData,
	PaymentFailedInvoiceItem,
} from '../paymentFailedEmail';
import { PermanentError } from '../permanentError';

const queryResponseSchema = <T extends z.ZodTypeAny>(recordSchema: T) =>
	z.object({ records: z.array(recordSchema).default([]) });

async function queryOne<T>(
	zuoraClient: ZuoraClient,
	query: string,
	recordSchema: z.ZodType<T>,
): Promise<T> {
	const { records } = await doQuery(
		zuoraClient,
		query,
		queryResponseSchema(recordSchema),
	);
	const [record] = records;
	if (records.length !== 1 || record === undefined) {
		throw new PermanentError(
			`Expected one record, got ${records.length}: ${query}`,
		);
	}
	return record;
}

const accountSchema = z.object({
	sfContactId__c: z.string().nullable().optional(),
	BillToId: z.string(),
});

const paymentSchema = z.object({ PaymentMethodId: z.string() });

const contactSchema = z.object({
	WorkEmail: z.string().nullable().optional(),
	FirstName: z.string(),
	LastName: z.string(),
});

const paymentMethodSchema = z.object({
	Type: z.string(),
	CreditCardType: z.string().nullable().optional(),
	CreditCardExpirationMonth: z.number().nullable().optional(),
	CreditCardExpirationYear: z.number().nullable().optional(),
});

const invoiceItemSchema = z.object({
	ProductName: z.string(),
	ChargeAmount: z.number(),
	ServiceStartDate: z.string(),
	ServiceEndDate: z.string(),
}) satisfies z.ZodType<PaymentFailedInvoiceItem>;

/**
 * Reads the email fields when sending, rather than when the workflow starts, as up to 14 days can pass.
 */
export async function getPaymentFailedEmailData(
	zuoraClient: ZuoraClient,
	{
		subscriptionNumber,
		accountNumber,
		unpaidInvoiceId,
		failedPaymentId,
	}: {
		subscriptionNumber: SubscriptionNumber;
		accountNumber: string;
		unpaidInvoiceId: string;
		failedPaymentId: string;
	},
): Promise<PaymentFailedEmailData> {
	const account = await queryOne(
		zuoraClient,
		`select sfContactId__c, BillToId from Account where AccountNumber = '${accountNumber}'`,
		accountSchema,
	);
	const contact = await queryOne(
		zuoraClient,
		`select WorkEmail, FirstName, LastName from Contact where Id = '${account.BillToId}'`,
		contactSchema,
	);
	// the failed payment's method, as the customer may have changed their default since
	const { PaymentMethodId } = await queryOne(
		zuoraClient,
		`select PaymentMethodId from Payment where Id = '${failedPaymentId}'`,
		paymentSchema,
	);
	const paymentMethod = await queryOne(
		zuoraClient,
		`select Type, CreditCardType, CreditCardExpirationMonth, CreditCardExpirationYear from PaymentMethod where Id = '${PaymentMethodId}'`,
		paymentMethodSchema,
	);
	const { records: invoiceItems } = await doQuery(
		zuoraClient,
		`select ProductName, ChargeAmount, ServiceStartDate, ServiceEndDate from InvoiceItem where InvoiceId = '${unpaidInvoiceId}' and SubscriptionNumber = '${subscriptionNumber}'`,
		queryResponseSchema(invoiceItemSchema),
	);

	return {
		subscriptionNumber,
		unpaidInvoiceId,
		sfContactId: account.sfContactId__c ?? undefined,
		emailAddress: contact.WorkEmail ?? undefined,
		firstName: contact.FirstName,
		lastName: contact.LastName,
		paymentMethod: {
			type: paymentMethod.Type,
			cardType: paymentMethod.CreditCardType ?? undefined,
			cardExpiryMonth: paymentMethod.CreditCardExpirationMonth ?? undefined,
			cardExpiryYear: paymentMethod.CreditCardExpirationYear ?? undefined,
		},
		invoiceItems,
	};
}
