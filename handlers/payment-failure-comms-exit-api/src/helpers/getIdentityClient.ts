import { IdentityClient } from '@modules/identity/identityClient';
import { stageFromEnvironment } from '@modules/stage';
import { getAppConfig } from './getAppConfig';

let identityClientPromise:
	| Promise<ReturnType<typeof IdentityClient.createWithAccessToken>>
	| undefined;

export const getIdentityClient = (): Promise<
	ReturnType<typeof IdentityClient.createWithAccessToken>
> => {
	identityClientPromise ??= (async () => {
		const config = await getAppConfig();
		return IdentityClient.createWithAccessToken(
			stageFromEnvironment(),
			config.identity.accessToken,
		);
	})();

	return identityClientPromise;
};
