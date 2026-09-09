import { getUserByIdentityId } from '@modules/identity/idapi';
import { IdentityClient } from '@modules/identity/identityClient';
import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { BrazeClient, type BrazeTrackPayload } from './brazeClient';
import { getAppConfig } from './config';

export type RuntimeDeps = {
	getBrazeUuidFromIdapi: (identityId: string) => Promise<string | undefined>;
	sendPaymentFailureExitEvent: (
		brazeUuid: string,
		time: string,
	) => Promise<void>;
	now: () => string;
};

let identityClientPromise: ReturnType<typeof IdentityClient.create> | undefined;
let brazeClientPromise:
	| Promise<{ client: BrazeClient; appId: string }>
	| undefined;

const getIdentityClient = (): ReturnType<typeof IdentityClient.create> => {
	if (!identityClientPromise) {
		const stage = stageFromEnvironment();
		identityClientPromise = IdentityClient.create(
			stage,
			`/${stage}/support/payment-failure-comms-exit-api/identity-client-access-token`,
		);
	}

	return identityClientPromise;
};

const getBrazeClient = async (): Promise<{
	client: BrazeClient;
	appId: string;
}> => {
	brazeClientPromise ??= (async () => {
		const config = await getAppConfig();
		return {
			client: new BrazeClient(config.braze.apiUrl, config.braze.apiKey),
			appId: config.braze.appId,
		};
	})();

	return brazeClientPromise;
};

export const buildPaymentFailureExitPayload = (
	brazeUuid: string,
	appId: string,
	time: string,
): BrazeTrackPayload => ({
	events: [
		{
			external_id: brazeUuid,
			app_id: appId,
			name: 'pf_csr_exit',
			time,
			_update_existing_only: true,
		},
	],
});

export const defaultDeps: RuntimeDeps = {
	getBrazeUuidFromIdapi: async (identityId) => {
		const identityClient = await getIdentityClient();
		const user = await getUserByIdentityId(identityClient, identityId);
		const brazeUuid = user?.privateFields?.brazeUuid?.trim();

		if (!brazeUuid) {
			logger.log('No Braze UUID found for the supplied Identity ID');
			return undefined;
		}

		return brazeUuid;
	},
	sendPaymentFailureExitEvent: async (brazeUuid, time) => {
		const { client, appId } = await getBrazeClient();
		await client.sendCustomEvent(
			buildPaymentFailureExitPayload(brazeUuid, appId, time),
		);
	},
	now: () => new Date().toISOString(),
};
