import type { z } from 'zod';
import type { NewAccount } from '@modules/zuora/orders/newAccount';
import type { OrderAction } from '@modules/zuora/orders/orderActions';
import type { PaymentMethod } from '@modules/zuora/orders/paymentMethods';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';

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
		customFields?: {
			LastPlanAddedDate__c?: string;
			DeliveryAgent__c?: string;
			ReaderType__c?: string;
		};
	}>;
};
export type PreviewOrderRequest = OrderRequest & {
	previewOptions: PreviewOptions;
};
export type CreateOrderRequest = OrderRequest & {
	processingOptions: ProcessingOptions;
};

export function executeOrderRequest<
	I,
	O,
	T extends z.ZodType<O, z.ZodTypeDef, I>,
>(
	zuoraClient: ZuoraClient,
	orderRequest: CreateOrderRequest,
	responseSchema: T,
	idempotencyKey?: string,
): Promise<O> {
	const path = `/v1/orders`;
	const body = JSON.stringify(orderRequest);
	const headers = idempotencyKey
		? { 'idempotency-key': idempotencyKey }
		: undefined;
	return zuoraClient.post(path, body, responseSchema, headers);
}

export function previewOrderRequest<
	I,
	O,
	T extends z.ZodType<O, z.ZodTypeDef, I>,
>(
	zuoraClient: ZuoraClient,
	orderRequest: PreviewOrderRequest,
	responseSchema: T,
): Promise<O> {
	const path = `/v1/orders/preview`;
	const body = JSON.stringify(orderRequest);
	return zuoraClient.post(path, body, responseSchema);
}
