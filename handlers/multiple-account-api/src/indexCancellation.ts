import { IdentityClient } from '@modules/identity/identityClient';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { CancellationEventSQSHandler } from '@modules/subscription-events/consumer/cancellationEventSqsHandler';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { AppConfig } from './appConfig';
import { ConfigSchema } from './appConfig';
import type { HandleCancellationServices } from './cancellation/handleCancellation';
import { handleCancellation } from './cancellation/handleCancellation';

// main entry point for AWS
export const handler = CancellationEventSQSHandler(
	ConfigSchema,
	handleCancellation,
	buildServices,
);

async function buildServices(
	env: HandlerEnv<AppConfig>,
): Promise<HandleCancellationServices> {
	return {
		stage: env.stage,
		secondaryUserRepository: SecondaryUserRepository.create(env.stage),
		identityClient: IdentityClient.createWithAccessToken(
			env.config['identity-client-access-token'],
			env.stage,
		),
		zuoraClient: await ZuoraClient.create(env.stage),
	};
}
