import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import { notFound, ok } from '@modules/routing/apiGatewayResponses';
import { defaultDeps, type RuntimeDeps } from './services';

export const paymentFailureCommsExitRequestSchema = z
	.object({
		identityId: z.string().trim().min(1),
	})
	.strict();

type PaymentFailureCommsExitRequest = z.infer<
	typeof paymentFailureCommsExitRequestSchema
>;

const paymentFailureCommsExitResponseSchema = z.object({
	status: z.literal('sent'),
});

export async function paymentFailureCommsExitEndpoint(
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
