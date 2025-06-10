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
	| 'RenewSubscription'
	| 'UpdateProduct'
	| 'AddProduct';

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
export type DiscountOrderAction = BaseOrderAction & {
	type: 'AddProduct';
	addProduct: {
		productRatePlanId: string;
	};
};

export type UpdateProductOrderAction = BaseOrderAction & {
	type: 'UpdateProduct';
	updateProduct: {
		ratePlanId: string;
		chargeUpdates: [
			{
				chargeNumber: string;
				pricing: {
					recurringFlatFee: {
						listPrice: number;
					};
				};
			},
		];
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
	| TermsAndConditionsOrderAction
	| UpdateProductOrderAction
	| DiscountOrderAction;

export type OrderRequest = {
	orderDate: string;
	existingAccountNumber: string;
	description?: string;
	subscriptions: Array<{
		subscriptionNumber: string;
		customFields?: { LastPlanAddedDate__c?: string };
		orderActions: OrderAction[];
	}>;
};
export type PreviewOrderRequest = OrderRequest & {
	previewOptions: PreviewOptions;
};
export type CreateOrderRequest = OrderRequest & {
	processingOptions: ProcessingOptions;
};
