/**
 * @group integration
 */
import type { Stage } from '@modules/stage';
import {
	createDigitalSubscription,
	createSupporterPlusSubscription,
} from '@modules/zuora/../test/it-helpers/createGuardianSubscription';
import { zuoraDateFormat } from '@modules/zuora/common';
import { Logger } from '@modules/logger';
import { cancelSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { previewDiscountEndpoint } from '../src/discountEndpoint';
import { validationRequirements } from '../src/eligibilityChecker';
import type { EligibilityCheckResponseBody } from '../src/responseSchema';

const stage: Stage = 'CODE';
const validIdentityId = '200175946';
const invalidIdentityId = 'qwertyuiop';

test("Subscriptions which don't belong to the provided identity Id are not eligible", async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(zuoraClient, true);

	await expect(async () => {
		await previewDiscountEndpoint(
			new Logger(),
			stage,
			{ 'x-identity-id': invalidIdentityId },
			subscriptionNumber,
			dayjs(),
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

	await expect(async () => {
		await previewDiscountEndpoint(
			new Logger(),
			stage,
			{ 'x-identity-id': validIdentityId },
			subscriptionNumber,
			dayjs(),
		);
	}).rejects.toThrow(validationRequirements.atLeastCatalogPrice);

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

	const result = await previewDiscountEndpoint(
		new Logger(),
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
		dayjs(),
	);
	const eligibilityCheckResult = result as EligibilityCheckResponseBody;

	const expected: EligibilityCheckResponseBody = {
		discountedPrice: 11.24,
		upToPeriods: 3,
		upToPeriodsType: 'Months',
		discountPercentage: 25,
		firstDiscountedPaymentDate: zuoraDateFormat(paymentDate),
		nextNonDiscountedPaymentDate: zuoraDateFormat(paymentDate.add(3, 'months')),
		nonDiscountedPayments: [
			{ date: zuoraDateFormat(paymentDate), amount: 14.99 },
			{ date: zuoraDateFormat(paymentDate.add(1, 'months')), amount: 14.99 },
			{ date: zuoraDateFormat(paymentDate.add(2, 'months')), amount: 14.99 },
		],
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
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	const result = await previewDiscountEndpoint(
		new Logger(),
		stage,
		{ 'x-identity-id': validIdentityId },
		subscriptionNumber,
		today.add(2, 'months').add(1, 'day'),
	);
	const eligibilityCheckResult = result as EligibilityCheckResponseBody;

	const expected: EligibilityCheckResponseBody = {
		discountedPrice: 0,
		upToPeriods: 2,
		upToPeriodsType: 'Months',
		discountPercentage: 100,
		firstDiscountedPaymentDate: zuoraDateFormat(paymentDate),
		nextNonDiscountedPaymentDate: zuoraDateFormat(paymentDate.add(2, 'months')),
		nonDiscountedPayments: [
			{ date: zuoraDateFormat(paymentDate), amount: 12 },
			{ date: zuoraDateFormat(paymentDate.add(1, 'months')), amount: 12 },
		],
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
