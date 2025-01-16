import { type SQSEvent } from 'aws-lambda';
import type Stripe from 'stripe';
import { getSecretValue } from '../services';
import { sendMessageToSqsQueue } from '../services/sqs';

type GuestRegistrationRequest = {
	token: string;
	userId: string;
	timeIssued: string;
};

type SuccessResponse = {
	status: 'ok';
	guestRegistrationRequest: GuestRegistrationRequest;
};

type ErrorDetail = {
	message: string;
	description: string;
	context: string;
};

type ErrorResponse = {
	status: 'error';
	errors: ErrorDetail[];
};

type FetchResponse = SuccessResponse | ErrorResponse;

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const body = JSON.parse(record.body) as {
				detail: Stripe.CheckoutSessionCompletedEvent;
			};

			console.log('Logging Stripe event...');
			console.log(JSON.stringify(body));

			const session = body.detail.data.object;

			const { bearerToken } = await getSecretValue<{ bearerToken: string }>({
				secretName: `${process.env.STAGE}/Identity/${process.env.APP}`,
			});

			const email = session.customer_details?.email;
			const firstName = session.customer_details?.name;

			if (!bearerToken) {
				throw new Error('Bearer token not found');
			}
			if (!email) {
				throw new Error('Customer email not found');
			}
			if (!process.env.IDENTITY_API_URL) {
				throw new Error('Identity API URL not found');
			}

			console.log('Fetching use from Identity API...');
			const response = await fetch(
				`${process.env.IDENTITY_API_URL}/user?` +
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
			const data = (await response.json()) as FetchResponse;

			let identityUserId;

			if (data.status == 'ok') {
				identityUserId = data.guestRegistrationRequest.userId;
			} else {
				console.log('Creating new guest user...');
				const response2 = await fetch(
					`${process.env.IDENTITY_API_URL}/guest` +
						new URLSearchParams({
							accountVerificationEmail: 'true',
						}).toString(),
					{
						method: 'POST',
						headers: {
							'x-gu-id-client-access-token': `Bearer ${bearerToken}`,
						},
						body: JSON.stringify({
							primaryEmailAddress: email,
							publicFields: {
								displayName: firstName,
							},
						}),
					},
				);
				console.log(response2);
				const data = (await response2.json()) as FetchResponse;
				if (data.status == 'ok') {
					identityUserId = data.guestRegistrationRequest.userId;
				}
			}

			if (!process.env.BRAZE_EMAILS_QUEUE_URL) {
				throw new Error('Braze queue URL not found');
			}

			if (!identityUserId) {
				throw new Error('User identity id not found');
			}

			const response3 = await sendMessageToSqsQueue({
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
			console.log(response3);
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
