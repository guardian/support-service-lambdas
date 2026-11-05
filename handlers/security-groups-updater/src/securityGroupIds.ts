import type { Stage } from '@modules/stage';

/**
 * The security groups this lambda is allowed to manage, hardcoded here
 * so the CDK stack can scope the lambda's IAM permissions down to exactly
 * these security groups
 */
type ManagedSite = {
	name: string;
	securityGroupIds: Partial<Record<Stage, string>>;
};

 // Add sites to manage here, either CODE or PROD stages can be omitted.
const managedSites: ManagedSite[] = [
	{
		name: 'support-frontend',
		securityGroupIds: {
			CODE: 'sg-00319d7c826a34db0',
			PROD: 'sg-089d1a001c21018c3',
		},
	},
];

export type ManagedSecurityGroup = { name: string; id: string };

export function securityGroupsForStage(stage: Stage): ManagedSecurityGroup[] {
	return managedSites.flatMap(({ name, securityGroupIds }) => {
		const id = securityGroupIds[stage];
		return id ? [{ name, id }] : [];
	});
}

export function securityGroupIdsForStage(stage: Stage): string[] {
	return securityGroupsForStage(stage).map((securityGroup) => securityGroup.id);
}
