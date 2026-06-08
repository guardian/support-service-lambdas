import { getUserByIdentityId } from '@modules/identity/idapi';
import { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { BrazeClient, type BrazeTrackPayload } from './brazeClient';
import { getAppConfig } from './config';

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
			`/${stage}/***/identity-client-access-token`, //token needs to be created
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
		if (!user.privateFields['braze-uuid']) {
			logger.log(
				`User found in IDAPI for identityId ${identityId} does not have a Braze UUID`,
			);
			return undefined;
		}
		return user.privateFields['braze-uuid'];
	},
	sendToBraze: async (payload) => {
		const brazeClient = await getBrazeClient();
		await brazeClient.updateUserAttributes(payload);
	},
};
