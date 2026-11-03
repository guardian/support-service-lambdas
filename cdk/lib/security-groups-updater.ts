import type { App } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
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

		lambda.addToRolePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: [
					'ec2:DescribeSecurityGroups',
					'ec2:AuthorizeSecurityGroupIngress',
					'ec2:RevokeSecurityGroupIngress',
					'ec2:CreateTags',
				],
				// the security group ids are configured via SSM (not known at synth
				// time), so this can't be scoped down to specific resource ARNs
				resources: ['*'],
			}),
		);
	}
}
