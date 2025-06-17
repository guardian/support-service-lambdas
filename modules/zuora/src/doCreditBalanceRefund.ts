import type { ZuoraClient } from './zuoraClient';
import type { ZuoraUpperCaseSuccessResponse } from './zuoraSchemas';
import { zuoraUpperCaseSuccessResponseSchema } from './zuoraSchemas';

export const doCreditBalanceRefund = async (
	zuoraClient: ZuoraClient,
	body: string,
): Promise<ZuoraUpperCaseSuccessResponse> => {
	const path = `/v1/object/credit-balance-refund`;
	return zuoraClient.post(path, body, zuoraUpperCaseSuccessResponseSchema);
};
