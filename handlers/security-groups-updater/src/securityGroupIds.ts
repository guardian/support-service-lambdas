import type { Stage } from '@modules/stage';

/**
 * The security groups this lambda is allowed to manage, hardcoded here
 * so the CDK can scope the lambda's IAM permissions down to exactly
 * these security groups.
 * We need the stack name so that the lambda can be triggered whenever the target
 * CloudFormation stack is deployed as the default security will be reinstated at
 * that point.
 */
type ManagedStack = {
	// The physical CloudFormation stack name
	cloudFormationStackName: string;
	stage: Stage;
	securityGroupId: string;
};

// Add stacks to manage here.
const managedStacks: ManagedStack[] = [
	{
		cloudFormationStackName: 'support-CODE-frontend',
		stage: 'CODE',
		securityGroupId: 'sg-00319d7c826a34db0',
	},
	{
		cloudFormationStackName: 'support-PROD-frontend',
		stage: 'PROD',
		securityGroupId: 'sg-089d1a001c21018c3',
	},
];

export type ManagedSecurityGroup = { name: string; id: string };

export function securityGroupsForStage(stage: Stage): ManagedSecurityGroup[] {
	return managedStacks
		.filter((managedStack) => managedStack.stage === stage)
		.map((managedStack) => ({
			name: managedStack.cloudFormationStackName,
			id: managedStack.securityGroupId,
		}));
}

export function securityGroupIdsForStage(stage: Stage): string[] {
	return securityGroupsForStage(stage).map((securityGroup) => securityGroup.id);
}

export function cloudFormationStackNamesForStage(stage: Stage): string[] {
	return managedStacks
		.filter((managedStack) => managedStack.stage === stage)
		.map((managedStack) => managedStack.cloudFormationStackName);
}
