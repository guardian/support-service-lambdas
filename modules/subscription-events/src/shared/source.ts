import { z } from 'zod';

/**
 * Every known producer of subscription-events, as `<prefix>:<base-system-name>` -
 * stage-agnostic (no `-CODE`/`-PROD` suffix baked in here; `SubscriptionEventService`
 * appends the stage itself when publishing). The prefix records what kind of
 * system it is, so a log link can be built consistently (see
 * `handlers/alarms-handler` for the equivalent convention used there):
 *  - `lambda:` - the value matches the real deployed lambda's base function name,
 *    so its CloudWatch log group is always `/aws/lambda/<value>-<stage>`.
 *  - `ec2:` - a non-lambda system (e.g. members-data-api); there's no single
 *    uniform log group convention, but the prefix still flags it as a known,
 *    typo-checked source rather than an arbitrary string.
 */
export const subscriptionEventSources = [
	'lambda:zuora-auto-cancel',
	'lambda:cancellation-sf-cases-api',
	'ec2:members-data-api',
] as const;

export const subscriptionEventSourceSchema = z.enum(subscriptionEventSources);
export type SubscriptionEventSource = (typeof subscriptionEventSources)[number];
