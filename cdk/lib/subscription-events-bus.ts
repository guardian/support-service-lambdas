import { type App, CfnOutput } from 'aws-cdk-lib';
import type { IEventBus } from 'aws-cdk-lib/aws-events';
import { EventBus, IncludeDetail, Level } from 'aws-cdk-lib/aws-events';
import {
	CfnDelivery,
	CfnDeliveryDestination,
	CfnDeliverySource,
	LogGroup,
	RetentionDays,
} from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import type { SrStageNames } from './cdk/SrStack';
import { SrStack } from './cdk/SrStack';

/**
 * A shared EventBridge bus for subscription lifecycle events.
 *
 * This stack only creates the bus with built-in CloudWatch Logs logging
 * for debugging. Producers and listeners are added in their own stacks/lambdas,
 * granted access via AllowPutSubscriptionEventPolicy (see cdk/policies.ts) or a
 * subscription on the exported bus ARN.
 */
export class SubscriptionEventsBus extends SrStack {
	static exportName = (stage: SrStageNames) =>
		`subscription-events-bus-${stage}-arn`;

	constructor(scope: App, stage: SrStageNames) {
		super(scope, { app: 'subscription-events-bus', stage });

		const busName = `subscription-events-${this.stage}`;

		const bus = new EventBus(this, 'Bus', {
			eventBusName: busName,
			logConfig: {
				level: Level.INFO,
				includeDetail: IncludeDetail.FULL, // include payload
			},
		});

		new EventBusLogDelivery(this, 'LogDelivery', bus);

		new CfnOutput(this, 'BusArn', {
			exportName: SubscriptionEventsBus.exportName(stage),
			value: bus.eventBusArn,
		});
	}
}

/**
 * Creates a log group and wires an EventBridge event bus's built-in logging
 * (https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus-logs.html) to it.
 */
class EventBusLogDelivery extends Construct {
	readonly logGroup: LogGroup;

	constructor(scope: Construct, id: string, eventBus: IEventBus) {
		super(scope, id);

		const busName = eventBus.eventBusName;

		/**
		 * Prefixing with /aws/vendedlogs gives cheaper pricing and automatic
		 * permissions.
		 */
		const vendedPrefix = '/aws/vendedlogs';

		this.logGroup = new LogGroup(this, 'LogGroup', {
			logGroupName: `${vendedPrefix}/events/event-bus/${busName}`,
			retention: RetentionDays.TWO_WEEKS,
		});

		const deliverySource = new CfnDeliverySource(this, 'DeliverySource', {
			name: busName,
			logType: 'INFO_LOGS',
			resourceArn: eventBus.eventBusArn,
		});

		const deliveryDestination = new CfnDeliveryDestination(
			this,
			'DeliveryDestination',
			{
				name: `${busName}-logs-destination`,
				destinationResourceArn: this.logGroup.logGroupArn,
			},
		);

		const delivery = new CfnDelivery(this, 'Delivery', {
			deliverySourceName: deliverySource.name,
			deliveryDestinationArn: deliveryDestination.attrArn,
		});

		// deliverySourceName above is a plain string (not a token), so CDK can't infer this
		// dependency automatically the way it does for deliveryDestinationArn.
		delivery.addDependency(deliverySource);
	}
}
