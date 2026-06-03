import { logger } from '@modules/logger/logger';
import type { Handler } from 'aws-lambda';
import {
	type AcquisitionDataRow,
	type AcquisitionsEventBridgeEvent,
	acquisitionsEventSchema,
} from './acquisitionEvent';

type BrazePayload = Record<string, unknown>;

type ProcessingServices = {
	getBrazeUuidFromIdapi: (identityId: string) => Promise<string | undefined>;
	transformEventForBraze: (
		event: AcquisitionDataRow,
		brazeUuid: string,
	) => BrazePayload | undefined;
	sendToBraze: (payload: BrazePayload) => Promise<void>;
};

const placeholderServices: ProcessingServices = {
	getBrazeUuidFromIdapi: (identityId) => {
		logger.log(
			`Placeholder: IDAPI lookup for identityId ${identityId} is not implemented`,
		);
		return Promise.resolve(undefined);
	},
	transformEventForBraze: () => {
		logger.log(
			'Placeholder: acquisition event transformation for Braze is not implemented',
		);
		return undefined;
	},
	sendToBraze: () => {
		logger.log(
			'Placeholder: sending transformed event to Braze is not implemented',
		);
		return Promise.resolve();
	},
};

export async function processAcquisitionEvent(
	event: unknown,
	services: ProcessingServices = placeholderServices,
): Promise<void> {
	const parsedEvent = acquisitionsEventSchema.parse(event);
	const identityId = parsedEvent.detail.identityId?.trim();

	if (!identityId) {
		logger.log(
			'Skipping event for guest account without identityId; execution is skipped',
		);
		return;
	}

	logger.mutableAddContext(identityId);
	try {
		const brazeUuid = await services.getBrazeUuidFromIdapi(identityId);
		if (!brazeUuid) {
			logger.log(
				'Skipping event because Braze UUID was not found from IDAPI placeholder',
			);
			return;
		}

		const brazePayload = services.transformEventForBraze(
			parsedEvent.detail,
			brazeUuid,
		);
		if (!brazePayload) {
			logger.log(
				'Skipping event because Braze payload transform placeholder is empty',
			);
			return;
		}

		await services.sendToBraze(brazePayload);
	} finally {
		logger.dropContext(identityId);
	}
}

export const handler: Handler<AcquisitionsEventBridgeEvent> = async (event) => {
	await processAcquisitionEvent(event);
};
