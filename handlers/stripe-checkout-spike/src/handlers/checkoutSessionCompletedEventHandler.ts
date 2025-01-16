import { type SQSEvent } from 'aws-lambda';
import type Stripe from 'stripe';
import { getSecretValue } from '../services';

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const body = JSON.parse(record.body) as {
				detail: Stripe.CheckoutSessionCompletedEvent;
			};

			console.log(JSON.stringify(body));

			const accessToken = await getSecretValue<string>({
				secretName: `${process.env.STAGE}/Identity/${process.env.APP}`,
			});

			const email = body.detail.data.object.customer_details?.email;
			console.log(email);
			console.log(accessToken);

			if (!accessToken || !email) {
				throw new Error('Error');
			}

			const response = await fetch(
				'https://idapi.theguardian.com/user?' +
					new URLSearchParams({
						emailAddress: email,
					}).toString(),
				{
					method: 'GET',
					headers: {
						'x-gu-id-client-access-token': `Bearer ${accessToken}`,
					},
				},
			);

			console.log(response);
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
