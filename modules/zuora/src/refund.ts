import type { ZuoraClient } from './zuoraClient';
import type { ZuoraUpperCaseSuccessResponse } from './zuoraSchemas';
import { zuoraUpperCaseSuccessResponseSchema } from './zuoraSchemas';

export const doRefund = async (
	zuoraClient: ZuoraClient,
	body: string,
): Promise<ZuoraUpperCaseSuccessResponse> => {
	const path = `/v1/object/refund1`;
	return zuoraClient.post(path, body, zuoraUpperCaseSuccessResponseSchema);
};
