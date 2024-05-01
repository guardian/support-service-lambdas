import { z } from 'zod';

export const productSwitchRequestSchema = z.object({
	price: z.number(),
	preview: z.boolean(),
	csrUserId: z.optional(z.string()),
	caseId: z.optional(z.string()),
});

export type ProductSwitchRequestBody = z.infer<
	typeof productSwitchRequestSchema
>;

export const zuoraPreviewResponseSchema = z.object({
	success: z.boolean(),
	previewResult: z.optional(
		z.object({
			invoices: z.array(
				z.object({
					amount: z.number(),
					amountWithoutTax: z.number(),
					taxAmount: z.number(),
					targetDate: z.string(),
					invoiceItems: z.array(
						z.object({
							serviceStartDate: z.string(),
							serviceEndDate: z.string(),
							amountWithoutTax: z.number(),
							taxAmount: z.number(),
							chargeName: z.string(),
							processingType: z.string(),
							productName: z.string(),
							productRatePlanChargeId: z.string(),
							unitPrice: z.number(),
							subscriptionNumber: z.string(),
						}),
					),
				}),
			),
		}),
	),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type ZuoraPreviewResponse = z.infer<typeof zuoraPreviewResponseSchema>;

export const zuoraSwitchResponseSchema = z.object({
	success: z.boolean(),
	invoiceNumbers: z.optional(z.array(z.string())),
	reasons: z.optional(z.array(z.object({ message: z.string() }))),
});

export type ZuoraSwitchResponse = z.infer<typeof zuoraSwitchResponseSchema>;

export const zuoraGetAmendmentResponseSchema = z.object({
	success: z.boolean(),
	id: z.optional(z.string()),
	status: z.optional(z.string()),
	type: z.optional(z.string()),
	customerAcceptanceDate: z.optional(z.string()),
	reasons: z.optional(
		z.array(z.object({ code: z.number(), message: z.string() })),
	),
});

export type ZuoraGetAmendmentResponse = z.infer<
	typeof zuoraGetAmendmentResponseSchema
>;

export type ProcessingOptions = {
	runBilling: boolean;
	collectPayment: boolean;
};
export type PreviewOptions = {
	previewThruType: 'SpecificDate';
	previewTypes: ['BillingDocs'];
	specificPreviewThruDate: string;
};
export type OrderActionType =
	| 'ChangePlan'
	| 'TermsAndConditions'
	| 'RenewSubscription';

type BaseOrderAction = {
	type: OrderActionType;
	triggerDates: [
		{
			name: 'ContractEffective';
			triggerDate: string;
		},
		{
			name: 'ServiceActivation';
			triggerDate: string;
		},
		{
			name: 'CustomerAcceptance';
			triggerDate: string;
		},
	];
};

export type ChangePlanOrderAction = BaseOrderAction & {
	type: 'ChangePlan';
	changePlan: {
		productRatePlanId: string;
		subType: 'Upgrade';
		newProductRatePlan: {
			productRatePlanId: string;
			chargeOverrides: [
				{
					productRatePlanChargeId: string;
					pricing: {
						recurringFlatFee: {
							listPrice: number;
						};
					};
				},
			];
		};
	};
};

export type RenewSubscriptionOrderAction = BaseOrderAction & {
	type: 'RenewSubscription';
	renewSubscription: object;
};

export type TermsAndConditionsOrderAction = BaseOrderAction & {
	type: 'TermsAndConditions';
	termsAndConditions: {
		lastTerm: {
			termType: 'TERMED';
			endDate: string;
		};
	};
};

export type OrderAction =
	| ChangePlanOrderAction
	| RenewSubscriptionOrderAction
	| TermsAndConditionsOrderAction;

type BaseOrderRequest = {
	orderDate: string;
	existingAccountNumber: string;
	subscriptions: Array<{
		subscriptionNumber: string;
		orderActions: OrderAction[];
	}>;
};

export type PreviewOrderRequest = BaseOrderRequest & {
	previewOptions: PreviewOptions;
};

export type CreateOrderRequest = BaseOrderRequest & {
	processingOptions: ProcessingOptions;
};
