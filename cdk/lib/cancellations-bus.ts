import { type App, CfnOutput } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { SrBusName } from './cdk/policies';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

const busNamePrefix: SrBusName = 'cancellations-bus';

/**
 * A dedicated EventBridge bus for subscription `Cancellation` events.
 *
 * This stack only creates the bus and a catch-all logging rule for debugging.
 * Producers and listeners are added in their own stacks/lambdas, granted access
 * via AllowBusPutEventsPolicy (see cdk/policies.ts) or SrEventBusLambda and
 * accessed via modules/subscription-events
 */
export class CancellationsBus extends SrStack {
	static exportName = (stage: SrStageNames) => `${busNamePrefix}-${stage}-arn`;

	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'cancellations-bus', stage });

		const busName = `${busNamePrefix}-${this.stage}`;

		const bus = new EventBus(this, 'Bus', {
			eventBusName: busName,
		});

		const logGroup = new LogGroup(this, 'LogAllEventsLogGroup', {
			logGroupName: `/aws/events/${busName}`,
			retention: RetentionDays.TWO_WEEKS,
		});

		const rule = new Rule(this, 'LogAllEventsRule', {
			description: `Log all events on the ${busName} bus to CloudWatch Logs for debugging`,
			eventBus: bus,
			eventPattern: { account: [this.account] },
			targets: [
				// can't use CloudWatchLogGroup as it needs custom/cdk lambdas
				{
					bind: () => ({ arn: logGroup.logGroupArn, targetResource: logGroup }),
				},
			],
		});

		logGroup.addToResourcePolicy(
			new PolicyStatement({
				effect: Effect.ALLOW,
				actions: ['logs:PutLogEvents', 'logs:CreateLogStream'],
				resources: [logGroup.logGroupArn],
				principals: [new ServicePrincipal('events.amazonaws.com')],
				conditions: {
					ArnEquals: { 'aws:SourceArn': rule.ruleArn },
				},
			}),
		);

		new CfnOutput(this, 'BusArn', {
			exportName: CancellationsBus.exportName(stage),
			value: bus.eventBusArn,
		});
	}
}
