import { getIfDefined } from '@modules/nullAndUndefined';
import type {
	CreateOrderRequest,
	OrderRequest,
} from '@modules/zuora/orders/orderRequests';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraSwitchResponseWithIdsSchema } from '../schemas';

export class CreateSwitchOrder {
	constructor(private zuoraClient: ZuoraClient) {}

	execute = async (orderRequest: OrderRequest): Promise<string> => {
		const requestBody: CreateOrderRequest = {
			processingOptions: {
				runBilling: true,
				collectPayment: false, // We will take payment separately because we don't want to charge the user if the amount payable is less than 50 pence/cents
			},
			...orderRequest,
		};

		const switchResponse = await this.zuoraClient.post(
			'v1/orders?returnIds=true',
			JSON.stringify(requestBody),
			zuoraSwitchResponseWithIdsSchema,
		);

		return getIfDefined(
			switchResponse.invoiceIds[0],
			'No invoice id returned from switch order',
		);
	};
}
