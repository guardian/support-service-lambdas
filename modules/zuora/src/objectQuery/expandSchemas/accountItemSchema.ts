import z from 'zod';
import type { ObjectQueryFieldRegistry } from '@modules/zuora/objectQuery/queries/types';

/**
 * https://developer.zuora.com/v1-api-reference/api/object-queries/queryaccountbykey
 */
export const accountItemSchema = {
	/** The unique identifier of the account. */
	id: z.string(),
	/** The unique identifier of the user who created the account. */
	createdById: z.string(),
	/** The date and time when the account was created. */
	createdDate: z.coerce.date(),
	/** The unique identifier of the user who last updated the account. */
	updatedById: z.string(),
	/** The date and time when the account was last updated. */
	updatedDate: z.coerce.date(),
	/** The account number that identifies the account. */
	accountNumber: z.string(),
	/** An additional email address to receive email notifications. */
	additionalEmailAddresses: z.string(),
	/** Indicates whether associated invoices can be edited. */
	allowInvoiceEdit: z.boolean(),
	/** Indicates whether future payments are automatically collected when due. */
	autoPay: z.boolean(),
	/** The customer's total invoice balance minus credit balance. */
	balance: z.number(),
	/** The alias name given to a batch; a string of 50 characters or less. */
	batch: z.string(),
	/** Bill cycle day setting option: ManualSet or AutoSet. */
	bcdSettingOption: z.enum(['ManualSet', 'AutoSet']),
	/** Billing cycle day (BCD): the day of the month when a bill run generates invoices. */
	billCycleDay: z.number().int(),
	/** The unique identifier of the bill-to contact associated with the account. */
	billToId: z.string(),
	/** The unique identifier of the communication profile used when sending notifications. */
	communicationProfileId: z.string(),
	/** The current credit balance on the account. */
	creditBalance: z.number(),
	/** External identifier of the account in a CRM system. */
	crmId: z.string(),
	/** A currency defined in the web-based UI administrative settings. */
	currency: z.string(),
	/** Name of the account's customer service representative, if applicable. */
	customerServiceRepName: z.string(),
	/** ID of the default payment method for the account. */
	defaultPaymentMethodId: z.string(),
	/** Indicates whether the customer wants to receive invoices through email. */
	invoiceDeliveryPrefsEmail: z.boolean(),
	/** Whether the customer wants to receive printed invoices such as through postal mail. */
	invoiceDeliveryPrefsPrint: z.boolean(),
	/** Invoice template ID configured in Billing Settings. */
	invoiceTemplateId: z.string(),
	/**
	 * Date of the most recent invoice for the account.
	 * Null if no invoice has ever been generated.
	 */
	lastInvoiceDate: z.coerce.date().nullable(),
	/** Monthly recurring revenue for the account. */
	mrr: z.number(),
	/** The name of the account. */
	name: z.string(),
	/** A string of up to 65,535 characters of notes. */
	notes: z.string(),
	/** The unique identifier of the organisation to which the account belongs. */
	organizationId: z.string(),
	/** The name of the payment gateway instance. If null or unassigned, the account uses the default gateway. */
	paymentGateway: z.string(),
	/** A payment-terms indicator defined in administrative settings, e.g. "Net 30". */
	paymentTerm: z.string(),
	/** The purchase order number provided by your customer. */
	purchaseOrderNumber: z.string(),
	/** Name of the account's sales representative, if applicable. */
	salesRepName: z.string(),
	/**
	 * The ID of the billing document sequence set assigned to the account.
	 * Null if no sequence set is assigned; billing documents use the default sequence set.
	 */
	sequenceSetId: z.string().nullable(),
	/** The unique identifier of the ship-to contact associated with the account. */
	shipToId: z.string(),
	/** The unique identifier of the sold-to contact associated with the account. */
	soldToId: z.string(),
	/** The account status. */
	status: z.enum(['Active', 'Draft', 'Canceled']),
	/** Total balance of all posted invoices. */
	totalInvoiceBalance: z.number(),
	/** Total unapplied balance in this currency. */
	unappliedBalance: z.number(),
	/** Total balance of all posted debit memos. */
	totalDebitMemoBalance: z.number(),
	/** The total unapplied amount of all posted credit memos in this currency. */
	unappliedCreditMemoAmount: z.number(),
	/** ID of the credit memo template used to generate credit memos for the account. */
	creditMemoTemplateId: z.string(),
	/** ID of the debit memo template used to generate debit memos for the account. */
	debitMemoTemplateId: z.string(),
	/** Whether the consent to use Cascading Payment Method was collected from your customer. */
	paymentMethodCascadingConsent: z.boolean(),
	/** Unique code that identifies a company account in Avalara. */
	taxCompanyCode: z.string(),
	/** ID of the customer tax exemption certificate. */
	taxExemptCertificateID: z.string(),
	/** Type of tax exemption certificate that the customer holds. */
	taxExemptCertificateType: z.string(),
	/** Description of the tax exemption certificate that the customer holds. */
	taxExemptDescription: z.string(),
	/** Date when the customer tax exemption starts, in YYYY-MM-DD format. */
	taxExemptEffectiveDate: z.coerce.date(),
	/** A unique entity use code to apply exemptions in Avalara AvaTax. */
	taxExemptEntityUseCode: z.string(),
	/** Date when the customer tax exemption expires, in YYYY-MM-DD format. */
	taxExemptExpirationDate: z.coerce.date(),
	/** Jurisdiction in which the customer tax exemption certificate was issued. */
	taxExemptIssuingJurisdiction: z.string(),
	/** Status of the account tax exemption. */
	taxExemptStatus: z.enum(['No', 'Yes', 'PendingVerification']),
	/** EU Value Added Tax ID. */
	vATId: z.string(),
} as const satisfies ObjectQueryFieldRegistry;
