import type { Handler } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import {
	type AcquisitionsEventBridgeEvent,
	acquisitionsEventSchema,
} from './acquisitionEvent';
import { defaultDeps, type RuntimeDeps } from './services';
import { transformEventForBrazePayload } from './transform';

export async function processAcquisitionEvent(
	event: unknown,
	deps: RuntimeDeps = defaultDeps,
): Promise<void> {
	const parsedEvent = acquisitionsEventSchema.parse(event);
	console.log('parsedEvent', JSON.stringify(parsedEvent, null, 2));
	const identityId = parsedEvent.detail.identityId?.trim();

	if (!identityId) {
		logger.log(
			'Skipping event for guest account without identityId; execution is skipped',
		);
		return;
	}

	logger.mutableAddContext(identityId);
	try {
		const brazeUuid = await deps.getBrazeUuidFromIdapi(identityId);
		if (!brazeUuid) {
			logger.log('Skipping event because Braze UUID was not found from IDAPI');
			return;
		}

		const brazePayload = transformEventForBrazePayload(
			parsedEvent.detail,
			brazeUuid,
		);

		await deps.sendToBraze(brazePayload);
	} finally {
		logger.dropContext(identityId);
	}
}

export const handler: Handler<AcquisitionsEventBridgeEvent> = async (event) => {
	await processAcquisitionEvent(event);
};
