/**
 * @group integration
 */
import type { Stage } from '@modules/stage';
import { cancelSubscription } from '@modules/zuora/cancelSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { applyDiscountEndpoint } from '../src/discountEndpoint';
import { ApplyDiscountResponseBody } from '../src/responseSchema';
import { createSupporterPlusSubscription } from './helpers';
import { zuoraDateFormat } from '@modules/zuora/common';

const stage: Stage = 'CODE';
const validIdentityId = '200175946';

test('Supporter Plus subscriptions can have a discount', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const today = dayjs();
	const paymentDate = today.add(16, 'day');

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	const result = await applyDiscountEndpoint(
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
	);
	const eligibilityCheckResult = result as ApplyDiscountResponseBody;

	const expected: ApplyDiscountResponseBody = {
		nextPaymentDate: zuoraDateFormat(paymentDate.add(2, 'months')),
	};
	expect(eligibilityCheckResult).toEqual(expected);

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
