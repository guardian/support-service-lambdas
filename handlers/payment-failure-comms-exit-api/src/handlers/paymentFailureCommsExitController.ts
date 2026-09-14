import type { APIGatewayProxyResult } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import { notFound, ok } from '@modules/routing/apiGatewayResponses';
import { paymentFailureCommsExitResponseSchema } from '../schemas/paymentFailureCommsExitResponseSchema';
import { defaultDeps } from '../services/defaultDeps';
import type { PaymentFailureCommsExitRequest } from '../types/paymentFailureCommsExit';
import type { RuntimeDeps } from '../types/runtimeDeps';

export async function paymentFailureCommsExitController(
	{ identityId }: PaymentFailureCommsExitRequest,
	deps: RuntimeDeps = defaultDeps,
): Promise<APIGatewayProxyResult> {
	logger.mutableAddContext(identityId);
	try {
		const brazeUuid = await deps.getBrazeUuidFromIdapi(identityId);
		if (!brazeUuid) {
			return notFound(
				'Identity user was not found for the supplied Identity ID',
			);
		}

		await deps.sendPaymentFailureExitEvent(brazeUuid, deps.now());

		return ok({ status: 'sent' }, paymentFailureCommsExitResponseSchema);
	} finally {
		logger.dropContext(identityId);
	}
}
