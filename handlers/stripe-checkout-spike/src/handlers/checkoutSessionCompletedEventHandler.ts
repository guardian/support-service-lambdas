import { type SQSEvent } from 'aws-lambda';
import type Stripe from 'stripe';
import { createGuestUser, getUser } from '../services/identity';
import { sendMessageToSqsQueue } from '../services/sqs';

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const body = JSON.parse(record.body) as {
				detail: Stripe.CheckoutSessionCompletedEvent;
			};

			console.log('Logging Stripe event...');
			console.log(JSON.stringify(body));

			const session = body.detail.data.object;
			const email = session.customer_details?.email;
			const firstName = session.customer_details?.name;
			let identityUserId;

			if (!email) {
				throw new Error('Customer email not present in event');
			}
			if (!firstName) {
				throw new Error('Firstname not present in event');
			}
			if (!process.env.IDENTITY_API_URL) {
				throw new Error('Identity API URL not found in environment variables');
			}
			if (!process.env.BRAZE_EMAILS_QUEUE_URL) {
				throw new Error('Braze queue URL not found in environment variables');
			}

			const { user: existingUser } = await getUser({ email });

			if (existingUser) {
				identityUserId = existingUser.userId;
			} else {
				const { user: guestUser, errors } = await createGuestUser({
					email,
					firstName,
				});
				if (guestUser) {
					identityUserId = guestUser.userId;
				} else {
					throw new Error(JSON.stringify(errors));
				}
			}

			await sendMessageToSqsQueue({
				queueUrl: process.env.BRAZE_EMAILS_QUEUE_URL,
				messageBody: JSON.stringify({
					To: {
						Address: email,
						SubscriberKey: email,
						ContactAttributes: {
							SubscriberAttributes: {
								EmailAddress: email,
								edition: getEdition(session.currency!),
								'payment method': 'credit / debit card',
								currency: session.currency!,
								amount: session.amount_total!.toFixed(2),
								first_name: firstName,
								date_of_payment: formatToCustomDate(Date.now()),
							},
						},
					},
					DataExtensionName: 'contribution-thank-you',
					IdentityUserId: identityUserId,
				}),
			});
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const getEdition = (currency: string) => {
	const editionsMapping: Record<string, string> = {
		GBP: 'uk',
		USD: 'us',
		AUD: 'au',
	};

	return editionsMapping[currency] ?? 'international';
};

const formatToCustomDate = (instant: number): string => {
	return new Intl.DateTimeFormat('en-GB', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date(instant));
};
