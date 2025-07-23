import { z } from 'zod';

// Common fields for all payment methods
export const BasePaymentMethodSchema = z.object({
	id: z.string(),
	type: z.string(),
	isDefault: z.boolean(),
	accountKey: z.string(),
	paymentMethodNumber: z.string().nullable(),
	status: z.string(),
	lastTransaction: z.string().nullable(),
	useDefaultRetryRule: z.boolean(),
	bankIdentificationNumber: z.string().nullable(),
	deviceSessionId: z.string().nullable(),
	existingMandate: z.string().nullable(),
	ipAddress: z.string().nullable(),
	lastFailedSaleTransactionDate: z.string().nullable(),
	lastTransactionDateTime: z.string().nullable(),
	lastTransactionStatus: z.string().nullable(),
	maxConsecutivePaymentFailures: z.number().nullable(),
	numConsecutiveFailures: z.number(),
	paymentRetryWindow: z.string().nullable(),
	totalNumberOfProcessedPayments: z.number(),
	totalNumberOfErrorPayments: z.number(),
	createdDate: z.string(),
	updatedDate: z.string(),
	createdBy: z.string(),
	updatedBy: z.string(),
});

// Account holder info schema
const AccountHolderInfoSchema = z.object({
	accountHolderName: z.string().nullable(),
	phone: z.string().nullable(),
	email: z.string().nullable(),
	addressLine1: z.string().nullable(),
	addressLine2: z.string().nullable(),
	zipCode: z.string().nullable(),
	city: z.string().nullable(),
	country: z.string().nullable(),
	state: z.string().nullable(),
});

// Mandate info schema
const MandateInfoSchema = z.object({
	mitProfileAction: z.string().nullable(),
	mitProfileType: z.string().nullable(),
	mitConsentAgreementSrc: z.string().nullable(),
	mitConsentAgreementRef: z.string().nullable(),
	mitTransactionId: z.string().nullable(),
	mitProfileAgreedOn: z.string().nullable(),
	mandateStatus: z.string().nullable(),
	mandateReason: z.string().nullable(),
	mandateId: z.string().nullable(),
	mandateReceivedStatus: z.string().nullable().optional(),
	existingMandateStatus: z.string().nullable().optional(),
	mandateCreationDate: z.string().nullable().optional(),
	mandateUpdateDate: z.string().nullable().optional(),
});

// Credit card payment method
const CreditCardPaymentMethodSchema = BasePaymentMethodSchema.extend({
	cardNumber: z.string(),
	expirationMonth: z.number(),
	expirationYear: z.number(),
	creditCardType: z.string(),
	accountHolderInfo: AccountHolderInfoSchema,
	mandateInfo: MandateInfoSchema,
	identityNumber: z.string().nullable(),
});

// Credit card reference transaction payment method
const CreditCardReferenceTransactionSchema = BasePaymentMethodSchema.extend({
	tokenId: z.string(),
	secondTokenId: z.string(),
	mandateInfo: MandateInfoSchema,
	cardNumber: z.string(),
	expirationMonth: z.number(),
	expirationYear: z.number(),
	creditCardType: z.string(),
	accountHolderInfo: AccountHolderInfoSchema,
	identityNumber: z.string().nullable(),
});

// PayPal payment method
const PayPalPaymentMethodSchema = BasePaymentMethodSchema.extend({
	BAID: z.string(),
	email: z.string(),
});

// Bank transfer payment method
const BankTransferPaymentMethodSchema = BasePaymentMethodSchema.extend({
	bankTransferType: z.string(),
	IBAN: z.string(),
	businessIdentificationCode: z.string().nullable(),
	accountNumber: z.string(),
	bankCode: z.string(),
	branchCode: z.string().nullable(),
	identityNumber: z.string().nullable(),
	accountHolderInfo: AccountHolderInfoSchema,
	mandateInfo: MandateInfoSchema,
});

// Main payment method response schema
export const DetailedPaymentMethodResponseSchema = z.object({
	defaultPaymentMethodId: z.string(),
	paymentGateway: z.string(),
	creditcard: z.array(CreditCardPaymentMethodSchema).optional(),
	creditcardreferencetransaction: z
		.array(CreditCardReferenceTransactionSchema)
		.optional(),
	paypal: z.array(PayPalPaymentMethodSchema).optional(),
	banktransfer: z.array(BankTransferPaymentMethodSchema).optional(),
	success: z.boolean(),
});

export type DetailedPaymentMethodResponse = z.infer<
	typeof DetailedPaymentMethodResponseSchema
>;
