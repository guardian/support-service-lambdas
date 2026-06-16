import { getUserByIdentityId } from '@modules/identity/idapi';
import { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { z } from 'zod';
import { BrazeClient, type BrazeTrackPayload } from './brazeClient';
import { getAppConfig } from './config';

const privateFieldsSchema = z.object({
	brazeUuid: z.string().optional(),
});

export type RuntimeDeps = {
	getBrazeUuidFromIdapi: (identityId: string) => Promise<string | undefined>;
	sendToBraze: (payload: BrazeTrackPayload) => Promise<void>;
};

let identityClientPromise: ReturnType<typeof IdentityClient.create> | undefined;
let brazeClientPromise: Promise<BrazeClient> | undefined;

const getIdentityClient = (): ReturnType<typeof IdentityClient.create> => {
	if (!identityClientPromise) {
		const stage = stageFromEnvironment();
		identityClientPromise = IdentityClient.create(
			stage,
			`/${stage}/support/braze-acquisition-events-sync/identity-client-access-token`,
		);
	}

	return identityClientPromise;
};

const getBrazeClient = async (): Promise<BrazeClient> => {
	brazeClientPromise ??= (async () => {
		const config = await getAppConfig();
		return new BrazeClient(config.braze.apiUrl, config.braze.apiKey);
	})();

	return brazeClientPromise;
};

export const defaultDeps: RuntimeDeps = {
	getBrazeUuidFromIdapi: async (identityId) => {
		const identityClient = await getIdentityClient();
		const user = await getUserByIdentityId(identityClient, identityId);
		if (!user) {
			logger.log(
				`No user found in IDAPI for identityId ${identityId}; cannot get Braze UUID`,
			);
			return undefined;
		}
		const parsedPrivateFields = privateFieldsSchema.safeParse(
			user.privateFields,
		);
		if (!parsedPrivateFields.success) {
			logger.log(
				`User found in IDAPI for identityId ${identityId} has unexpected privateFields format`,
			);
			return undefined;
		}

		const brazeUuidFromResponse = parsedPrivateFields.data.brazeUuid;
		if (
			typeof brazeUuidFromResponse !== 'string' ||
			brazeUuidFromResponse.length === 0
		) {
			logger.log(
				`User found in IDAPI for identityId ${identityId} does not have a Braze UUID`,
			);
			return undefined;
		}
		return brazeUuidFromResponse;
	},
	sendToBraze: async (payload) => {
		const brazeClient = await getBrazeClient();
		await brazeClient.updateUserAttributes(payload);
	},
};
