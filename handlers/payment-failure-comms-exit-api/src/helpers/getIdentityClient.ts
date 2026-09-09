import { IdentityClient } from '@modules/identity/identityClient';
import { stageFromEnvironment } from '@modules/stage';
import { identityClientAccessTokenPath } from '../constants';

let identityClientPromise: ReturnType<typeof IdentityClient.create> | undefined;

export const getIdentityClient = (): ReturnType<
	typeof IdentityClient.create
> => {
	if (!identityClientPromise) {
		const stage = stageFromEnvironment();
		identityClientPromise = IdentityClient.create(
			stage,
			identityClientAccessTokenPath(stage),
		);
	}

	return identityClientPromise;
};
