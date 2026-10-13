import type { IEventBus } from 'aws-cdk-lib/aws-events';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import type { SrBusName } from './policies';
import { getNameWithStage } from './SrLambda';
import type { SrSqsLambdaProps } from './SrSqsLambda';
import { SrSqsLambda } from './SrSqsLambda';
import type { SrStack } from './SrStack';

type SrEventBusLambdaProps = SrSqsLambdaProps & {
	/**
	 * Which EventBridge bus this lambda's queue should be subscribed to.
	 */
	bus: SrBusName;
};

/**
 * A lambda wired to an EventBridge bus (e.g. the cancellations bus - see
 * `modules/subscription-events`) via SQS. Each bus only ever carries one
 * event type (a new bus is created for each new event type, rather than
 * routing multiple event types through one bus via `detail-type`), so this
 * forwards every event on the bus to the queue unfiltered.
 *
 * Usage:
 * <pre>
 * import { SrEventBusLambda } from './cdk/SrEventBusLambda';
 *
 * const lambda = new SrEventBusLambda(this, 'CancellationEventsLambda', {
 * 	bus: 'cancellations-bus',
 * 	monitoring: { errorImpact: '...' },
 * 	// ...maxReceiveCount, lambdaOverrides, visibilityTimeout etc.
 * });
 * </pre>
 */
export class SrEventBusLambda extends SrSqsLambda {
	readonly bus: IEventBus;
	readonly rule: Rule;

	constructor(scope: SrStack, id: string, props: SrEventBusLambdaProps) {
		super(scope, id, props);

		const busName = `${props.bus}-${scope.stage}`;

		this.bus = EventBus.fromEventBusName(scope, `${id}EventBus`, busName);

		this.rule = new Rule(scope, `${id}Rule`, {
			ruleName: getNameWithStage(scope, props.nameSuffix, 'event-bus-rule'),
			description: `Forwards all events from the ${busName} bus to ${scope.app}'s queue.`,
			eventBus: this.bus,
			eventPattern: { account: [scope.account] },
		});

		this.rule.addTarget(new SqsQueue(this.inputQueue));
	}
}
