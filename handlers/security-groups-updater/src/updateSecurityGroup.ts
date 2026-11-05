import dayjs from 'dayjs';
import { logger } from '@modules/logger/logger';
import * as ec2 from './ec2';
import {
	buildDesiredIpPermissions,
	diffIpPermissions,
} from './ipPermissionsDiff';

// Only 443 is managed - this security group is not expected to allow
// unencrypted (port 80) access from Fastly.
export const managedPorts = [443];

export async function updateSecurityGroup(
	securityGroupId: string,
	securityGroupName: string,
	fastlyCidrs: string[],
): Promise<void> {
	logger.log(
		`updating security group ${securityGroupId} (${securityGroupName})`,
	);

	const currentPermissions = await ec2.getIngressPermissions(securityGroupId);
	const desiredPermissions = buildDesiredIpPermissions(
		fastlyCidrs,
		managedPorts,
	);
	const { toAuthorize, toRevoke } = diffIpPermissions(
		currentPermissions,
		desiredPermissions,
	);

	await ec2.authorizeIngress(securityGroupId, toAuthorize);
	await ec2.revokeIngress(securityGroupId, toRevoke);
	await ec2.tagSecurityGroup(securityGroupId, {
		Updated: dayjs().toISOString(),
	});

	logger.log(
		`security group ${securityGroupId} (${securityGroupName}) updated: authorized ${toAuthorize.length} permission(s), revoked ${toRevoke.length} permission(s)`,
	);
}
