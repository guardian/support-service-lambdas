import { OrderAction } from '@modules/zuora/orders/orderActions';
import { NewAccount } from '@modules/zuora/orders/newAccount';

export type ProcessingOptions = {
	runBilling: boolean;
	collectPayment: boolean;
};
export type PreviewOptions = {
	previewThruType: 'SpecificDate';
	previewTypes: ['BillingDocs'];
	specificPreviewThruDate: string;
};

type NewAccountOrderRequest = {
	newAccount: NewAccount;
};
export type ExistingAccountOrderRequest = {
	existingAccountNumber: string;
};
type AccountOrderRequest = NewAccountOrderRequest | ExistingAccountOrderRequest;
export type OrderRequest = AccountOrderRequest & {
	orderDate: string;
	description?: string;
	subscriptions: Array<{
		subscriptionNumber?: string;
		orderActions: OrderAction[];
	}>;
};
export type PreviewOrderRequest = OrderRequest & {
	previewOptions: PreviewOptions;
};
export type CreateOrderRequest = OrderRequest & {
	processingOptions: ProcessingOptions;
};
