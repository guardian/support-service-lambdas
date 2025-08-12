import type { z } from 'zod';
import type { NewAccount } from '@modules/zuora/orders/newAccount';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { PaymentMethod } from '@modules/zuora/orders/paymentMethods';

export type ProcessingOptions = {
	runBilling: boolean;
	collectPayment: boolean;
};
export type PreviewOptions = {
	previewThruType: 'SpecificDate';
	previewTypes: ['BillingDocs'];
	specificPreviewThruDate: string;
};

type NewAccountOrderRequest<T extends PaymentMethod> = {
	newAccount: NewAccount<T>;
};
export type ExistingAccountOrderRequest = {
	existingAccountNumber: string;
};
type AccountOrderRequest =
	| NewAccountOrderRequest<PaymentMethod>
	| ExistingAccountOrderRequest;
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
export type AnyOrderRequest = CreateOrderRequest | PreviewOrderRequest;

export function executeOrderRequest<
	I,
	O,
	T extends z.ZodType<O, z.ZodTypeDef, I>,
>(
	zuoraClient: ZuoraClient,
	orderRequest: AnyOrderRequest,
	schema: T,
): Promise<O> {
	const path = `/v1/orders`;
	const body = JSON.stringify(orderRequest);
	return zuoraClient.post(path, body, schema);
}
