import type { IpPermission } from '@aws-sdk/client-ec2';
import {
	AuthorizeSecurityGroupIngressCommand,
	CreateTagsCommand,
	DescribeSecurityGroupsCommand,
	EC2Client,
	RevokeSecurityGroupIngressCommand,
} from '@aws-sdk/client-ec2';
import { awsConfig } from '@modules/aws/config';
import { wrapAwsClient } from '@modules/logger/wrapAwsClient';

const ec2Client = wrapAwsClient(new EC2Client(awsConfig));

export async function getIngressPermissions(
	securityGroupId: string,
): Promise<IpPermission[]> {
	const response = await ec2Client.send(
		new DescribeSecurityGroupsCommand({ GroupIds: [securityGroupId] }),
	);
	const [securityGroup] = response.SecurityGroups ?? [];
	if (!securityGroup) {
		throw new Error(`Security group ${securityGroupId} not found`);
	}
	return securityGroup.IpPermissions ?? [];
}

export async function authorizeIngress(
	securityGroupId: string,
	permissions: IpPermission[],
): Promise<void> {
	if (permissions.length === 0) {
		return;
	}
	await ec2Client.send(
		new AuthorizeSecurityGroupIngressCommand({
			GroupId: securityGroupId,
			IpPermissions: permissions,
		}),
	);
}

export async function revokeIngress(
	securityGroupId: string,
	permissions: IpPermission[],
): Promise<void> {
	if (permissions.length === 0) {
		return;
	}
	await ec2Client.send(
		new RevokeSecurityGroupIngressCommand({
			GroupId: securityGroupId,
			IpPermissions: permissions,
		}),
	);
}

export async function tagSecurityGroup(
	securityGroupId: string,
	tags: Record<string, string>,
): Promise<void> {
	await ec2Client.send(
		new CreateTagsCommand({
			Resources: [securityGroupId],
			Tags: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
		}),
	);
}
