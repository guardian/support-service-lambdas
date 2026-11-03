import { logger } from '@modules/logger/logger';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { LambdaHandler } from '@modules/routing/lambdaHandler';
import { ConfigSchema } from './configSchema';
import { getFastlyIpv4Ranges } from './fastly';
import { updateSecurityGroup } from './updateSecurityGroup';

// called by AWS
export const handler = LambdaHandler(ConfigSchema, handlerWithStage);

export async function handlerWithStage(
	_event: unknown,
	{ config }: HandlerEnv<ConfigSchema>,
): Promise<void> {
	logger.log(
		`updating ${config.securityGroupIds.length} security group(s) to allow Fastly IPs only`,
	);

	const fastlyCidrs = await getFastlyIpv4Ranges();

	await Promise.all(
		config.securityGroupIds.map((securityGroupId) =>
			updateSecurityGroup(securityGroupId, fastlyCidrs),
		),
	);
}
