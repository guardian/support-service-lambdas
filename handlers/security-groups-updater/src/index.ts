import { logger } from '@modules/logger/logger';
import { stageFromEnvironment } from '@modules/stage';
import { getFastlyIpv4Ranges } from './fastly';
import { securityGroupsForStage } from './securityGroupIds';
import { updateSecurityGroup } from './updateSecurityGroup';

// called by AWS
export async function handler(): Promise<void> {
	const securityGroups = securityGroupsForStage(stageFromEnvironment());

	logger.log(
		`updating ${securityGroups.length} security group(s) to allow Fastly IPs only`,
	);

	const fastlyCidrs = await getFastlyIpv4Ranges();

	await Promise.all(
		securityGroups.map(({ id, name }) =>
			updateSecurityGroup(id, name, fastlyCidrs),
		),
	);
}
