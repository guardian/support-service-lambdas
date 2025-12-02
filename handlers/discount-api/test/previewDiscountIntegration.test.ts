/**
 * @group integration
 */
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import type { Stage } from '@modules/stage';
import {
	createDigitalSubscription,
	createSupporterPlusSubscription,
} from '@modules/zuora/../test/it-helpers/createGuardianSubscription';
import { getAccount } from '@modules/zuora/account';
import {
	cancelSubscription,
	getSubscription,
} from '@modules/zuora/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import dayjs from 'dayjs';
import { previewDiscountHandler } from '../src';
import { previewDiscountEndpoint } from '../src/discountEndpoint';
import { validationRequirements } from '../src/eligibilityChecker';
import type { EligibilityCheckResponseBody } from '../src/responseSchema';

const stage: Stage = 'CODE';
const invalidIdentityId = 'qwertyuiop';

test("Subscriptions which don't belong to the provided identity Id are not eligible", async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(zuoraClient, true);

	await expect(async () => {
		await withMMAIdentityCheck(
			stage,
			previewDiscountHandler,
			(parsed) => parsed.body.subscriptionNumber,
		)({ headers: { 'x-identity-id': invalidIdentityId } }, undefined, {
			subscriptionNumber,
		});
	}).rejects.toThrow('does not belong to identity ID');

	console.log('Cancelling the subscription');
	await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
}, 30000);
test('Subscriptions on the old price are not eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	console.log('Creating a new digital subscription');
	const subscriptionNumber = await createDigitalSubscription(zuoraClient, true);
	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	await expect(async () => {
		await previewDiscountEndpoint(
			stage,
			zuoraClient,
			subscription,
			account,
			dayjs(),
		);
	}).rejects.toThrow(validationRequirements.atLeastCatalogPrice);

	console.log('Cancelling the subscription');
	await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
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

	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const result = await previewDiscountEndpoint(
		stage,
		zuoraClient,
		subscription,
		account,
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
	await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
}, 30000);

test('Supporter Plus subscriptions are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const today = dayjs();
	const paymentDate = today.add(16, 'day');

	console.log('Creating a new S+ subscription');
	const subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

	const subscription = await getSubscription(zuoraClient, subscriptionNumber);
	const account = await getAccount(zuoraClient, subscription.accountNumber);

	const result = await previewDiscountEndpoint(
		stage,
		zuoraClient,
		subscription,
		account,
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
	await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
}, 30000);
