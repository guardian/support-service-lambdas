/**
 * @group integration
 */
import type { Stage } from '@modules/stage';
import { cancelSubscription } from '@modules/zuora/cancelSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { applyDiscountEndpoint } from '../src/discountEndpoint';
import { ApplyDiscountResponseBody } from '../src/responseSchema';
import {
	createDigitalSubscription,
	createSupporterPlusSubscription,
} from './helpers';
import { zuoraDateFormat } from '@modules/zuora/common';
import { EmailMessageWithUserId } from '@modules/email/email';

const stage: Stage = 'CODE';
const validIdentityId = '200175946';

test('Supporter Plus subscriptions can have a discount and get an email', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const today = dayjs();

	const paymentDate = today.add(16, 'day');

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	const { response, emailPayload } = await applyDiscountEndpoint(
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
	);

	const expected: ApplyDiscountResponseBody = {
		nextPaymentDate: zuoraDateFormat(paymentDate.add(2, 'months')),
	};
	const expectedEmail: EmailMessageWithUserId = {
		To: {
			Address: 'test.user@thegulocal.com',
			ContactAttributes: {
				SubscriberAttributes: {
					first_name: 'Test',
					last_name: 'User',
					first_discounted_payment_date: paymentDate.format('DD MMMM YYYY'),
					next_non_discounted_payment_date: paymentDate
						.add(2, 'months')
						.format('DD MMMM YYYY'),
				},
			},
		},
		DataExtensionName: 'cancellation-discount-confirmation-email',
		IdentityUserId: '200175946',
	};

	expect(response as ApplyDiscountResponseBody).toEqual(expected);
	expect(emailPayload).toEqual(expectedEmail);

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);

test('digi subs can have a discount but dont get an email', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const today = dayjs();

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(
		zuoraClient,
		false,
	);

	const { response, emailPayload } = await applyDiscountEndpoint(
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
	);

	const expected: ApplyDiscountResponseBody = {
		nextPaymentDate: zuoraDateFormat(today.add(16, 'day')),
	};

	expect(response as ApplyDiscountResponseBody).toEqual(expected);
	expect(emailPayload).toEqual(undefined);

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
