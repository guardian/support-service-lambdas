/**
 * @group integration
 */
import dayjs from 'dayjs';
import type { Stage } from '../../../modules/stage';
import { checkEligibilityEndpoint } from '../src/endpoints/applyDiscountEndpoint';
import { checkDefined } from '../src/nullAndUndefined';
import { eligibilityCheckSchema } from '../src/responseSchema';
import { cancelSubscription } from '../src/zuora/cancelSubscription';
import { createZuoraClient } from '../src/zuora/zuoraClient';
import { createDigitalSubscription } from './helpers';

const stage: Stage = 'CODE';
test('checkEligibility', async () => {
	const requestBody = {
		subscriptionNumber: 'A-S00711320',
		discountProductRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
	};

	const result = await checkEligibilityEndpoint(
		'CODE',
		JSON.stringify(requestBody),
	);
	expect(result.statusCode).toBe(200);
	expect(result.body).toBe(JSON.stringify({ valid: false }));
}, 30000);

test('Subscriptions on the old price are not eligible', async () => {
	const zuoraClient = await createZuoraClient(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, true);

	const subscriptionNumber = checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		discountProductRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
	};

	const result = await checkEligibilityEndpoint(
		stage,
		JSON.stringify(requestBody),
	);
	const eligibilityCheckResult = eligibilityCheckSchema.parse(
		JSON.parse(result.body),
	);
	expect(eligibilityCheckResult.valid).toEqual(false);

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);

test('Subscriptions on the new price are eligible', async () => {
	const zuoraClient = await createZuoraClient(stage);

	console.log('Creating a new digital subscription');
	const subscribeResponse = await createDigitalSubscription(zuoraClient, false);

	const subscriptionNumber = checkDefined(
		subscribeResponse[0]?.SubscriptionNumber,
		'SubscriptionNumber was undefined in response from Zuora',
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		discountProductRatePlanId: '2c92c0f962cec7990162d3882afc52dd',
	};

	const result = await checkEligibilityEndpoint(
		stage,
		JSON.stringify(requestBody),
	);
	const eligibilityCheckResult = eligibilityCheckSchema.parse(
		JSON.parse(result.body),
	);
	expect(eligibilityCheckResult.valid).toEqual(false);

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
