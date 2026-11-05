import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
	cloudFormationStackNamesForStage,
	securityGroupIdsForStage,
} from '../../handlers/security-groups-updater/src/securityGroupIds';
import { SrScheduledLambda } from './cdk/SrScheduledLambda';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

export class SecurityGroupsUpdater extends SrStack {
	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'security-groups-updater', stage });

		const lambda = new SrScheduledLambda(this, 'Lambda', {
			rules: [
				{
					schedule: Schedule.rate(Duration.minutes(60)),
					description:
						'Updates security group ingress rules to only allow access from Fastly IPs',
				},
			],
			lambdaOverrides: {
				description:
					'Updates security group rules on a list of load balancers to only allow inbound access from Fastly IP ranges',
				timeout: Duration.seconds(60),
			},
			monitoring: {
				errorImpact:
					'a load balancer security group may allow inbound access from stale IP ranges, or may be missing a current Fastly range',
			},
		});

		const securityGroupArns = securityGroupIdsForStage(stage).map(
			(securityGroupId) =>
				`arn:aws:ec2:${this.region}:${this.account}:security-group/${securityGroupId}`,
		);

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['ec2:DescribeSecurityGroups'],
				// this action doesn't support resource-level permissions, so it
				// can't be scoped down - it's read-only
				resources: ['*'],
			}),
		);

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: [
					'ec2:AuthorizeSecurityGroupIngress',
					'ec2:RevokeSecurityGroupIngress',
					'ec2:CreateTags',
				],
				// scoped to the security groups this lambda is configured
				// to manage (see securityGroupIds.ts)
				resources: securityGroupArns,
			}),
		);

		// in addition to the hourly schedule, trigger this lambda as soon as a
		// managed site's stack finishes deploying - its own CloudFormation
		// template re-asserts a public ingress rule on every deploy (e.g. a
		// GuEc2App with a public ALB listener), so without this the security
		// group would sit open to the world until the next scheduled run.
		// see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-successfully-create-stack-eventbridge.html
		const cloudFormationStackNames = cloudFormationStackNamesForStage(stage);
		if (cloudFormationStackNames.length > 0) {
			new Rule(this, 'DeployTriggerRule', {
				description:
					'Triggers security-groups-updater as soon as a managed site finishes deploying',
				eventPattern: {
					source: ['aws.cloudformation'],
					detailType: ['CloudFormation Stack Status Change'],
					detail: {
						'stack-id': cloudFormationStackNames.map((name) => ({
							prefix: `arn:aws:cloudformation:${this.region}:${this.account}:stack/${name}/`,
						})),
						'status-details': {
							status: ['CREATE_COMPLETE', 'UPDATE_COMPLETE'],
						},
					},
				},
				targets: [new LambdaFunction(lambda)],
				enabled: true,
			});
		}
	}
}
