import type { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import { notFound, ok } from '@modules/routing/apiGatewayResponses';
import { paymentFailureCommsExitResponseSchema } from '../schemas';
import { defaultDeps } from '../services';
import type { PaymentFailureCommsExitRequest, RuntimeDeps } from '../types';

export async function paymentFailureCommsExitController(
	{ identityId }: PaymentFailureCommsExitRequest,
	deps: RuntimeDeps = defaultDeps,
): Promise<APIGatewayProxyResult> {
	logger.mutableAddContext(identityId);

	try {
		const brazeUuid = await deps.getBrazeUuidFromIdapi(identityId);
		if (!brazeUuid) {
			return notFound();
		}

		await deps.sendPaymentFailureExitEvent(brazeUuid, deps.now());

		return ok({ status: 'sent' }, paymentFailureCommsExitResponseSchema);
	} finally {
		logger.dropContext(identityId);
	}
}
