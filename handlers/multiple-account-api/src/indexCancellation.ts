import { z } from 'zod';
import { IdentityClient } from '@modules/identity/identityClient';
import { SecondaryUserRepository } from '@modules/multiple-account/secondaryUserRepository';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { stageFromEnvironment } from '@modules/stage';
import { EventBridgeSQSHandler } from '@modules/subscription-events/consumer/eventBridgeSqsHandler';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { HandleCancellationServices } from './cancellation/handleCancellation';
import { handleCancellation } from './cancellation/handleCancellation';

const configSchema = z.object({
	'identity-client-access-token': z.string(),
});

export const handler = EventBridgeSQSHandler(
	configSchema,
	handleCancellation,
	({
		config,
	}: HandlerEnv<z.infer<typeof configSchema>>): HandleCancellationServices => {
		const stage = stageFromEnvironment();
		return {
			stage,
			secondaryUserRepository: SecondaryUserRepository.create(stage),
			identityClient: IdentityClient.createWithAccessToken(
				config['identity-client-access-token'],
				stage,
			),
			zuoraClient: ZuoraClient.create(stage),
		};
	},
);
