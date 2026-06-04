import { getUserByIdentityId } from '@modules/identity/idapi';
import { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import {
	type AcquisitionDataRow,
	type AcquisitionsEventBridgeEvent,
	acquisitionsEventSchema,
} from './acquisitionEvent';

type BrazePayload = Record<string, unknown>;

// Fields need review: these are initial suggestions and may need to be adjusted based on what Braze
export type AcquisitionBrazeAttributes = {
	has_active_product: boolean;
	latest_product_type: string;
	latest_acquisition_date: string;
};

export function transformEventForBrazeAttributes(
	event: AcquisitionsEventBridgeEvent,
): AcquisitionBrazeAttributes {
	return {
		has_active_product: true, // hardcoded for now
		latest_product_type: JSON.stringify(event.detail.product),
		latest_acquisition_date: event.detail.eventTimeStamp,
	};
}

type ProcessingServices = {
	getBrazeUuidFromIdapi: (identityId: string) => Promise<string | undefined>;
	transformEventForBraze: (
		event: AcquisitionDataRow,
		brazeUuid: string,
	) => BrazePayload | undefined;
	sendToBraze: (payload: BrazePayload) => Promise<void>;
};

const getIdentityClient = (): ReturnType<typeof IdentityClient.create> => {
	const stage = stageFromEnvironment();
	return IdentityClient.create(
		stage,
		`/${stage}/***/identity-client-access-token`, //token needs to be created
	);
};

const placeholderServices: ProcessingServices = {
	getBrazeUuidFromIdapi: async (identityId) => {
		const identityClient = await getIdentityClient();
		const user = await getUserByIdentityId(identityClient, identityId);
		if (!user) {
			logger.log(
				`No user found in IDAPI for identityId ${identityId}; cannot get Braze UUID`,
			);
			return undefined;
		}
		if (!user.privateFields['braze-uuid']) {
			logger.log(
				`User found in IDAPI for identityId ${identityId} does not have a Braze UUID`,
			);
			return undefined;
		}
		return user.privateFields['braze-uuid'];
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
