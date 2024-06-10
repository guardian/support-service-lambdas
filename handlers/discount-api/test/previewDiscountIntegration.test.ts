/**
 * @group integration
 */
import type { Stage } from '@modules/stage';
import { cancelSubscription } from '@modules/zuora/cancelSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { discountEndpoint } from '../src/discountEndpoint';
import { EligibilityCheckResponseBody } from '../src/responseSchema';
import { createDigitalSubscription, createSubscription } from './helpers';
import { supporterPlusSubscribeBody } from './fixtures/request-bodies/supporterplus-subscribe-body-tier2';
import { zuoraDateFormat } from '@modules/zuora/common';

const stage: Stage = 'CODE';
const validIdentityId = '200175946';
const invalidIdentityId = 'qwertyuiop';
``;
test("Subscriptions which don't belong to the provided identity Id are not eligible", async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(zuoraClient, true);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	await expect(async () => {
		await discountEndpoint(
			stage,
			true,
			{ 'x-identity-id': invalidIdentityId },
			JSON.stringify(requestBody),
		);
	}).rejects.toThrow('does not belong to identity ID');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);
test('Subscriptions on the old price are not eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(zuoraClient, true);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	await expect(async () => {
		await discountEndpoint(
			stage,
			true,
			{ 'x-identity-id': validIdentityId },
			JSON.stringify(requestBody),
		);
	}).rejects.toThrow('it is not eligible for a discount');

	console.log('Cancelling the subscription');
	const cancellationResult = await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
	expect(cancellationResult.success).toEqual(true);
}, 30000);

test('Subscriptions on the new price are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const today = dayjs();
	const paymentDate = today.add(16, 'day');

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(
		zuoraClient,
		false,
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	const result = await discountEndpoint(
		stage,
		true,
		{ 'x-identity-id': validIdentityId },
		JSON.stringify(requestBody),
	);
	const eligibilityCheckResult = result as EligibilityCheckResponseBody;

	const expected: EligibilityCheckResponseBody = {
		discountedPrice: 11.24,
		upToPeriods: 3,
		upToPeriodsType: 'Months',
		firstDiscountedPaymentDate: zuoraDateFormat(paymentDate),
		nextNonDiscountedPaymentDate: zuoraDateFormat(paymentDate.add(3, 'months')),
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

test('Supporter Plus subscriptions are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const today = dayjs();
	const paymentDate = today.add(16, 'day');

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSubscription(
		zuoraClient,
		supporterPlusSubscribeBody(today),
	);

	const requestBody = {
		subscriptionNumber: subscriptionNumber,
		preview: true,
	};

	const result = await discountEndpoint(
		stage,
		true,
		{ 'x-identity-id': validIdentityId },
		JSON.stringify(requestBody),
	);
	const eligibilityCheckResult = result as EligibilityCheckResponseBody;

	const expected: EligibilityCheckResponseBody = {
		discountedPrice: 0,
		upToPeriods: 2,
		upToPeriodsType: 'Months',
		firstDiscountedPaymentDate: zuoraDateFormat(paymentDate),
		nextNonDiscountedPaymentDate: zuoraDateFormat(paymentDate.add(2, 'months')),
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
