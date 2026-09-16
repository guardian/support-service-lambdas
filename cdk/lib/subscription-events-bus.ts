import { type App, CfnOutput } from 'aws-cdk-lib';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { CloudWatchLogGroup } from 'aws-cdk-lib/aws-events-targets';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

/**
 * A shared EventBridge bus for subscription lifecycle events.
 *
 * This stack only creates the bus and a catch-all logging rule for debugging.
 * Producers and listeners are added in their own stacks/lambdas, granted access
 * via AllowPutSubscriptionEventPolicy (see cdk/policies.ts) or a subscription
 * on the exported bus ARN.
 */
export class SubscriptionEventsBus extends SrStack {
	static exportName = (stage: SrStageNames) =>
		`subscription-events-bus-${stage}-arn`;

	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'subscription-events-bus', stage });

		const busName = `subscription-events-${this.stage}`;

		const bus = new EventBus(this, 'Bus', {
			eventBusName: busName,
		});

		const logGroup = new LogGroup(this, 'LogAllEventsLogGroup', {
			logGroupName: `/aws/events/${busName}`,
			retention: RetentionDays.TWO_WEEKS,
		});

		new Rule(this, 'LogAllEventsRule', {
			description: `Log all events on the ${busName} bus to CloudWatch Logs for debugging`,
			eventBus: bus,
			eventPattern: { account: [this.account] },
			targets: [new CloudWatchLogGroup(logGroup)],
		});

		new CfnOutput(this, 'BusArn', {
			exportName: SubscriptionEventsBus.exportName(stage),
			value: bus.eventBusArn,
		});
	}
}
