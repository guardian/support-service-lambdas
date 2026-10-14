import { z } from 'zod';
import { IdentityClient } from '@modules/identity/identityClient';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { CancellationEventSQSHandler } from '@modules/subscription-events/consumer/cancellationEventSqsHandler';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { HandleCancellationServices } from './cancellation/handleCancellation';
import { handleCancellation } from './cancellation/handleCancellation';

const configSchema = z.object({
	'identity-client-access-token': z.string(),
});

type ConfigType = z.infer<typeof configSchema>;

// main entry point for AWS
export const handler = CancellationEventSQSHandler(
	configSchema,
	handleCancellation,
	buildServices,
);

async function buildServices(
	env: HandlerEnv<ConfigType>,
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
