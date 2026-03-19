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
	paymentRetryWindow: z.union([z.string(), z.number()]).nullable(),
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
	mitProfileAction: z.string().nullish(),
	mitProfileType: z.string().nullish(),
	mitConsentAgreementSrc: z.string().nullish(),
	mitConsentAgreementRef: z.string().nullish(),
	mitTransactionId: z.string().nullish(),
	mitProfileAgreedOn: z.string().nullish(),
	mandateStatus: z.string().nullable(),
	mandateReason: z.string().nullable(),
	mandateId: z.string().nullable(),
	mandateReceivedStatus: z.string().nullish(),
	existingMandateStatus: z.string().nullish(),
	mandateCreationDate: z.string().nullish(),
	mandateUpdateDate: z.string().nullish(),
});

// Credit card payment method
export const CreditCardPaymentMethodSchema = BasePaymentMethodSchema.extend({
	cardNumber: z.string(),
	expirationMonth: z.number(),
	expirationYear: z.number(),
	creditCardType: z.string(),
	accountHolderInfo: AccountHolderInfoSchema,
	mandateInfo: MandateInfoSchema,
	identityNumber: z.string().nullable(),
});

// Credit card reference transaction payment method
export const CreditCardReferenceTransactionSchema =
	BasePaymentMethodSchema.extend({
		tokenId: z.string(),
		secondTokenId: z.string(),
		mandateInfo: MandateInfoSchema,
		cardNumber: z.string().nullable(),
		expirationMonth: z.number().nullable(),
		expirationYear: z.number().nullable(),
		creditCardType: z.string().nullable(),
		accountHolderInfo: AccountHolderInfoSchema,
		identityNumber: z.string().nullable(),
	});

// PayPal payment method
export const PayPalPaymentMethodSchema = BasePaymentMethodSchema.extend({
	BAID: z.string(),
	email: z.string(),
});

// Bank transfer payment method
export const BankTransferPaymentMethodSchema = BasePaymentMethodSchema.extend({
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

export type CreditCardPaymentMethod = z.infer<
	typeof CreditCardPaymentMethodSchema
>;
export type CreditCardReferenceTransaction = z.infer<
	typeof CreditCardReferenceTransactionSchema
>;
export type PayPalPaymentMethod = z.infer<typeof PayPalPaymentMethodSchema>;
export type BankTransferPaymentMethod = z.infer<
	typeof BankTransferPaymentMethodSchema
>;

// Main payment method response schema
export const DefaultPaymentMethodResponseSchema = z.object({
	defaultPaymentMethodId: z.string(),
	paymentGateway: z.string().nullable(),
	creditcard: z.array(CreditCardPaymentMethodSchema).optional(),
	creditcardreferencetransaction: z
		.array(CreditCardReferenceTransactionSchema)
		.optional(),
	paypal: z.array(PayPalPaymentMethodSchema).optional(),
	banktransfer: z.array(BankTransferPaymentMethodSchema).optional(),
});

export type DefaultPaymentMethodResponse = z.infer<
	typeof DefaultPaymentMethodResponseSchema
>;
