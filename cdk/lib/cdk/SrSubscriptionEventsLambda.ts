import type { IEventBus } from 'aws-cdk-lib/aws-events';
import { EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { getNameWithStage } from './SrLambda';
import type { SrSqsLambdaProps } from './SrSqsLambda';
import { SrSqsLambda } from './SrSqsLambda';
import type { SrStack } from './SrStack';

// supported detail-types - same list as in `modules/subscription-events/src/shared/cancellationEvent.ts`
export type SubscriptionEventDetailType = 'Cancellation';

type SrSubscriptionEventsLambdaProps = SrSqsLambdaProps & {
	/**
	 * Which `detail-type`(s) on the `subscription-events-${stage}` bus this
	 * lambda's queue should receive.
	 */
	detailTypes: SubscriptionEventDetailType[];
};

/**
 * A lambda wired to the `subscription-events-${stage}` bus.
 *
 * Usage:
 * <pre>
 * import { SrSubscriptionEventsLambda } from './cdk/SrSubscriptionEventsLambda';
 *
 * const lambda = new SrSubscriptionEventsLambda(this, 'CancellationEventsLambda', {
 * 	detailTypes: ['Cancellation'],
 * 	monitoring: { errorImpact: '...' },
 * 	// ...maxReceiveCount, lambdaOverrides, visibilityTimeout etc.
 * });
 * </pre>
 */
export class SrSubscriptionEventsLambda extends SrSqsLambda {
	readonly bus: IEventBus;
	readonly rule: Rule;

	constructor(
		scope: SrStack,
		id: string,
		props: SrSubscriptionEventsLambdaProps,
	) {
		super(scope, id, props);

		this.bus = EventBus.fromEventBusName(
			scope,
			`${id}SubscriptionEventsBus`,
			`subscription-events-${scope.stage}`,
		);

		this.rule = new Rule(scope, `${id}Rule`, {
			ruleName: getNameWithStage(
				scope,
				props.nameSuffix,
				'subscription-events-rule',
			),
			description: `Forwards ${props.detailTypes.join(', ')} events from the subscription-events bus to ${scope.app}'s queue.`,
			eventBus: this.bus,
			eventPattern: { detailType: props.detailTypes },
		});

		this.rule.addTarget(new SqsQueue(this.inputQueue));
	}
}
