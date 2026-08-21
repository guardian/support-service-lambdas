/**
 * @group integration
 */
import {
	createDigitalSubscription,
	createSupporterPlusSubscription,
} from '@modules/zuora/../test/it-helpers/createGuardianSubscription';
import dayjs from 'dayjs';
import { withMMAIdentityCheck } from '@modules/routing/withMMAIdentityCheck';
import type { Stage } from '@modules/stage';
import { getAccount } from '@modules/zuora/account';
import {
	cancelSubscription,
	getSubscription,
} from '@modules/zuora/subscription';
import { zuoraDateFormat } from '@modules/zuora/utils';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { previewDiscountHandler } from '../src';
import { previewDiscountEndpoint } from '../src/discountEndpoint';
import { validationRequirements } from '../src/eligibilityChecker';
import type { EligibilityCheckResponseBody } from '../src/responseSchema';

const stage: Stage = 'CODE';
const invalidIdentityId = 'qwertyuiop';

const cancelTestSubscription = async (
	zuoraClient: ZuoraClient,
	subscriptionNumber: string,
) => {
	console.log('Cancelling the subscription');
	await cancelSubscription(
		zuoraClient,
		subscriptionNumber,
		dayjs().add(1, 'month'),
		true,
	);
};

test("Subscriptions which don't belong to the provided identity Id are not eligible", async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	let subscriptionNumber: string | undefined;

	try {
		console.log('Creating a new digital subscription');
		const createdSubscriptionNumber = await createDigitalSubscription(
			zuoraClient,
			true,
		);
		subscriptionNumber = createdSubscriptionNumber;

		await expect(async () => {
			await withMMAIdentityCheck(
				stage,
				previewDiscountHandler(stage),
				(parsed) => parsed.body.subscriptionNumber,
			)({ headers: { 'x-identity-id': invalidIdentityId } }, undefined, {
				subscriptionNumber: createdSubscriptionNumber,
			});
		}).rejects.toThrow('does not belong to identity ID');
	} finally {
		if (subscriptionNumber) {
			await cancelTestSubscription(zuoraClient, subscriptionNumber);
		}
	}
}, 30000);
test('Subscriptions on the old price are not eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);
	let subscriptionNumber: string | undefined;

	try {
		console.log('Creating a new digital subscription');
		subscriptionNumber = await createDigitalSubscription(zuoraClient, true);
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
	} finally {
		if (subscriptionNumber) {
			await cancelTestSubscription(zuoraClient, subscriptionNumber);
		}
	}
}, 30000);

test('Subscriptions on the new price are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const today = dayjs();
	const paymentDate = today.add(16, 'day');
	let subscriptionNumber: string | undefined;

	try {
		console.log('Creating a new digital subscription');
		subscriptionNumber = await createDigitalSubscription(zuoraClient, false);

		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const result = await previewDiscountEndpoint(
			stage,
			zuoraClient,
			subscription,
			account,
			today,
		);
		const eligibilityCheckResult = result as EligibilityCheckResponseBody;

		expect(eligibilityCheckResult).toMatchObject({
			upToPeriods: 3,
			upToPeriodsType: 'Months',
			discountPercentage: 25,
			firstDiscountedPaymentDate: zuoraDateFormat(paymentDate),
			nextNonDiscountedPaymentDate: zuoraDateFormat(
				paymentDate.add(3, 'months'),
			),
			nonDiscountedPayments: [
				{ date: zuoraDateFormat(paymentDate) },
				{ date: zuoraDateFormat(paymentDate.add(1, 'months')) },
				{ date: zuoraDateFormat(paymentDate.add(2, 'months')) },
			],
		});

		const firstPayment = eligibilityCheckResult.nonDiscountedPayments[0];
		expect(firstPayment).toBeDefined();
		expect(eligibilityCheckResult.discountedPrice).toBeCloseTo(
			firstPayment!.amount * 0.75,
		);
		expect(
			eligibilityCheckResult.nonDiscountedPayments.map(({ amount }) => amount),
		).toEqual([
			firstPayment!.amount,
			firstPayment!.amount,
			firstPayment!.amount,
		]);
	} finally {
		if (subscriptionNumber) {
			await cancelTestSubscription(zuoraClient, subscriptionNumber);
		}
	}
}, 30000);

test('Supporter Plus subscriptions are eligible', async () => {
	const zuoraClient = await ZuoraClient.create(stage);

	const today = dayjs();
	const paymentDate = today.add(16, 'day');
	let subscriptionNumber: string | undefined;

	try {
		console.log('Creating a new S+ subscription');
		subscriptionNumber = await createSupporterPlusSubscription(zuoraClient);

		const subscription = await getSubscription(zuoraClient, subscriptionNumber);
		const account = await getAccount(zuoraClient, subscription.accountNumber);

		const result = await previewDiscountEndpoint(
			stage,
			zuoraClient,
			subscription,
			account,
			today,
		);
		const eligibilityCheckResult = result as EligibilityCheckResponseBody;

		expect(eligibilityCheckResult).toMatchObject({
			discountedPrice: 0,
			upToPeriods: 2,
			upToPeriodsType: 'Months',
			discountPercentage: 100,
			firstDiscountedPaymentDate: zuoraDateFormat(paymentDate),
			nextNonDiscountedPaymentDate: zuoraDateFormat(
				paymentDate.add(2, 'months'),
			),
			nonDiscountedPayments: [
				{ date: zuoraDateFormat(paymentDate) },
				{ date: zuoraDateFormat(paymentDate.add(1, 'months')) },
			],
		});

		const firstPayment = eligibilityCheckResult.nonDiscountedPayments[0];
		expect(firstPayment).toBeDefined();
		expect(
			eligibilityCheckResult.nonDiscountedPayments.map(({ amount }) => amount),
		).toEqual([firstPayment!.amount, firstPayment!.amount]);
	} finally {
		if (subscriptionNumber) {
			await cancelTestSubscription(zuoraClient, subscriptionNumber);
		}
	}
}, 30000);
