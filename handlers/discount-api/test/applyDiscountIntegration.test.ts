/**
 * @group integration
 */
import type { EmailMessageWithUserId } from '@modules/email/email';
import { Logger } from '@modules/logger';
import type { Stage } from '@modules/stage';
import { cancelSubscription } from '@modules/zuora/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import {
	createDigitalSubscription,
	createSupporterPlusSubscription,
} from '../../../modules/zuora/test/it-helpers/createGuardianSubscription';
import { applyDiscountEndpoint } from '../src/discountEndpoint';
import type { ApplyDiscountResponseBody } from '../src/responseSchema';

const stage: Stage = 'CODE';
const validIdentityId = '200175946';

test('Supporter Plus subscriptions can have a discount and get an email', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	const today = dayjs();

	const paymentDate = today.add(16, 'day');

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	const { response, emailPayload } = await applyDiscountEndpoint(
		new Logger(),
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
		paymentDate.add(2, 'months').add(1, 'day'),
	);

	const expected: ApplyDiscountResponseBody = {
		nextNonDiscountedPaymentDate: zuoraDateFormat(paymentDate.add(2, 'months')),
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
		new Logger(),
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
		today,
	);

	const paymentDate = today.add(16, 'day');
	const expected: ApplyDiscountResponseBody = {
		nextNonDiscountedPaymentDate: zuoraDateFormat(paymentDate),
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
						.add(3, 'month')
						.format('DD MMMM YYYY'),
				},
			},
		},
		DataExtensionName: 'digipack-monthly-discount-confirmation-email',
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
