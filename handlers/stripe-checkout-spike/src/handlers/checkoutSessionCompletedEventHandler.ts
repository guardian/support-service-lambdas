import { type SQSEvent } from 'aws-lambda';
import type Stripe from 'stripe';
import { getSecretValue } from '../services';
import { sendMessageToSqsQueue } from '../services/sqs';

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const body = JSON.parse(record.body) as {
				detail: Stripe.CheckoutSessionCompletedEvent;
			};

			console.log(JSON.stringify(body));

			const session = body.detail.data.object;

			const { bearerToken } = await getSecretValue<{ bearerToken: string }>({
				secretName: `${process.env.STAGE}/Identity/${process.env.APP}`,
			});

			console.log(bearerToken);

			const email = session.customer_details?.email;
			const firstName = session.customer_details?.name;

			if (!bearerToken || !email) {
				throw new Error('Access token or email not found');
			}

			console.log('Fetching use from Identity API...');
			const response = await fetch(
				'https://idapi.code.dev-theguardian.com//user?' +
					new URLSearchParams({
						emailAddress: email,
					}).toString(),
				{
					method: 'GET',
					headers: {
						'x-gu-id-client-access-token': `Bearer ${bearerToken}`,
					},
				},
			);
			console.log(response);

			const response2 = await sendMessageToSqsQueue({
				body: JSON.stringify({
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
					IdentityUserId: 'xxx',
				}),
			});
			console.log(response2);
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
