import z from 'zod';

export const invoiceItemSchema = z.object({
	/** The unique identifier of the invoice. */
	id: z.string(),
	/** The unique identifier of the user who created the invoice. */
	createdById: z.string(),
	/** The time that the invoice was created, in YYYY-MM-DD HH:MM:SS format. */
	createdDate: z.coerce.date(),
	/** The unique identifier of the user who last updated the invoice. */
	updatedById: z.string(),
	/** The time that the invoice was last updated, in YYYY-MM-DD HH:MM:SS format. */
	updatedDate: z.coerce.date(),
	/** The ID of the customer account associated with the invoice. */
	accountId: z.string(),
	/** The amount of invoice adjustments associated with the invoice. */
	adjustmentAmount: z.number(),
	/** The total amount of the invoice. */
	amount: z.number(),
	/** The invoice amount excluding tax. */
	amountWithoutTax: z.number(),
	/** Whether invoices are automatically picked up for processing in the corresponding payment run. */
	autoPay: z.boolean(),
	/** The remaining balance of the invoice after all payments, adjustments, and refunds. */
	balance: z.number(),
	/** The ID of the bill-to contact associated with the invoice. */
	billToContactId: z.string(),
	// /** The ID of the bill-to contact snapshot associated with the invoice. */
	// billToContactSnapshotId: z.string(),
	/** Comments about the invoice. */
	comments: z.string(),
	/** The currency of the invoice. */
	currency: z.string(),
	/** The date by which payment for this invoice is due, in yyyy-mm-dd format. */
	dueDate: z.coerce.date(),
	/** Specifies whether the invoice includes one-time charges. */
	includesOneTime: z.boolean(),
	/** Specifies whether the invoice includes recurring charges. */
	includesRecurring: z.boolean(),
	/** Specifies whether the invoice includes usage charges. */
	includesUsage: z.boolean(),
	/** The date that appears on the invoice being created. */
	invoiceDate: z.coerce.date(),
	/** The unique identification number of the invoice. */
	invoiceNumber: z.string(),
	/** The date when the invoice was last emailed. */
	lastEmailSentDate: z.coerce.date(),
	/** The amount of payments applied to the invoice. */
	paymentAmount: z.number(),
	/** The payment term associated with the invoice, e.g. "Net 30". */
	paymentTerm: z.string(),
	/** The user ID of the person who moved the invoice to Posted status. */
	postedBy: z.string(),
	/** The date when the invoice was posted. */
	postedDate: z.coerce.date(),
	/** The amount of a refund applied against an earlier payment on the invoice. */
	refundAmount: z.number(),
	/** The ID of the sequence set associated with the invoice. */
	sequenceSetId: z.string(),
	/** The source of the invoice. */
	source: z.enum(['BillRun', 'API', 'ApiSubscribe', 'ApiAmend']),
	/**
	 * The ID of the invoice source.
	 * If generated from a bill run, the value is the bill run number; otherwise null.
	 */
	sourceId: z.string().nullable(),
	/** Whether the invoice is reversed. */
	reversed: z.boolean(),
	/** The type of the invoice source. */
	sourceType: z.enum(['Subscription', 'Standalone', 'Order', 'Consolidation']),
	/** The status of the invoice. */
	status: z.enum(['Draft', 'Posted', 'Split']),
	/** The date used to determine which charges are billed; all charges on or before this date are included. */
	targetDate: z.coerce.date(),
	/** The amount of taxation. */
	taxAmount: z.number(),
	/** The calculated tax amount excluded due to exemption. */
	taxExemptAmount: z.number(),
	/** The message returned by the tax engine if tax calculation fails. */
	taxMessage: z.string().nullable(),
	/** The ID of the communication profile associated with the invoice. */
	communicationProfileId: z.string().nullable(),

	// -------------------------------------------------------------------------
	// Feature-gated: Credit Balance (only when Invoice Settlement is disabled)
	// -------------------------------------------------------------------------

	/** The currency amount of the adjustment applied to the customer's credit balance. */
	creditBalanceAdjustmentAmount: z.number().optional(),

	// -------------------------------------------------------------------------
	// Feature-gated: Invoice Settlement
	// -------------------------------------------------------------------------

	/** The currency amount of all credit memos applied to this invoice. */
	creditMemoAmount: z.number().optional(),
});
