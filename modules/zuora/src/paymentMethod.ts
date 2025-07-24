import type { ZuoraClient } from './zuoraClient';
import type {
	PaymentMethod,
	ZuoraPaymentMethodQueryResponse,
} from './zuoraSchemas';
import { zuoraPaymentMethodQueryResponseSchema } from './zuoraSchemas';

export const getPaymentMethods = async (
	zuoraClient: ZuoraClient,
	accountId: string,
): Promise<ZuoraPaymentMethodQueryResponse> => {
	const path = `/v1/accounts/${accountId}/payment-methods`;
	return zuoraClient.get(path, zuoraPaymentMethodQueryResponseSchema);
};
