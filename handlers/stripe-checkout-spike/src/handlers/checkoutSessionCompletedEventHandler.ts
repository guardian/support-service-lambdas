import { type SQSEvent } from 'aws-lambda';
import type Stripe from 'stripe';
import type { AcquisitionEvent } from '../services/eventbridge';
import { putEvent } from '../services/eventbridge';
import { createGuestUser, getUser } from '../services/identity';
import { sendMessageToSqsQueue } from '../services/sqs';

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const body = JSON.parse(record.body) as {
				time: string;
				detail: Stripe.CheckoutSessionCompletedEvent;
			};

			console.info('Logging Stripe event...');
			console.info(JSON.stringify(body));

			const timestamp = body.time;
			const session = body.detail.data.object;
			const email = session.customer_details?.email;
			const firstName = session.customer_details?.name;
			const currency = session.currency?.toUpperCase();
			const amount = session.amount_total;
			const country = session.customer_details?.address?.country ?? null;
			const postalCode = session.customer_details?.address?.postal_code ?? null;
			const state = session.customer_details?.address?.state ?? null;
			const paymentId =
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: (session.payment_intent?.id ?? '');

			if (!email) {
				throw new Error('Customer email not present in event');
			}
			if (!firstName) {
				throw new Error('First name not present in event');
			}
			if (!currency) {
				throw new Error('Currency not present in event');
			}
			if (!amount) {
				throw new Error('Amount not present in event');
			}
			if (!process.env.IDENTITY_API_URL) {
				throw new Error('Identity API URL not found in environment variables');
			}
			if (!process.env.BRAZE_EMAILS_QUEUE_URL) {
				throw new Error('Braze queue URL not found in environment variables');
			}
			if (!process.env.CONTRIBUTIONS_STORE_QUEUE_URL) {
				throw new Error(
					'Contributions store URL not found in environment variables',
				);
			}
			if (!process.env.SOFT_OPT_IN_CONSENT_QUEUE_URL) {
				throw new Error(
					'Soft opt in consent queue URL not found in environment variables',
				);
			}
			if (!process.env.ACQUISITION_BUS_NAME) {
				throw new Error(
					'Acquisition bus name not found in environment variables',
				);
			}

			console.info('Getting or creating guest identity profile...');
			const identityId = await getOrCreateUserIdentity({
				email,
				firstName,
			});

			console.info('Sending thank you email...');
			await sendThankYouEmail({
				email,
				queueUrl: process.env.BRAZE_EMAILS_QUEUE_URL,
				currency,
				firstName,
				identityId,
				amount,
			});

			const contributionId = crypto.randomUUID();
			console.info('Saving record in contributions store...');
			await saveRecordInContributionsStore({
				queueUrl: process.env.CONTRIBUTIONS_STORE_QUEUE_URL,
				paymentId,
				identityId,
				email,
				created: timestamp,
				currency,
				amount,
				contributionId,
				country,
				postalCode,
				state,
			});

			console.info('Saving soft opt in consent...');
			await saveSoftOptInConsent({
				queueUrl: process.env.SOFT_OPT_IN_CONSENT_QUEUE_URL,
				identityId,
				contributionId,
			});

			console.info('Sending acquisition event...');
			await sendAcquisitionEvent({
				eventBusName: process.env.ACQUISITION_BUS_NAME,
				event: {
					eventTimeStamp: timestamp,
					product: 'CONTRIBUTION',
					amount: amount / 100,
					country,
					currency,
					componentId: null,
					componentType: null,
					campaignCode: null,
					source: null,
					referrerUrl: null,
					abTests: [],
					paymentFrequency: 'ONE_OFF',
					paymentProvider: 'STRIPE',
					printOptions: null,
					browserId: null,
					identityId,
					pageViewId: null,
					referrerPageViewId: null,
					labels: ['one-time-checkout'],
					promoCode: null,
					reusedExistingPaymentMethod: false,
					readerType: 'Direct',
					acquisitionType: 'Purchase',
					zuoraSubscriptionNumber: null,
					contributionId,
					paymentId,
					queryParameters: [],
					platform: 'STRIPE_CHECKOUT_SPIKE',
					postalCode,
					state,
					email,
				},
			});
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const getEdition = (currency: string): string => {
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

const getOrCreateUserIdentity = async ({
	email,
	firstName,
}: {
	email: string;
	firstName: string;
}): Promise<string> => {
	const { user } = await getUser({ email });

	if (user) {
		console.info('User exists with this email...');
		return user.id;
	} else {
		console.info('User does not exists with this email...');
		const { guestRegistrationRequest, errors } = await createGuestUser({
			email,
			firstName,
		});
		if (guestRegistrationRequest) {
			return guestRegistrationRequest.userId;
		} else {
			throw new Error(JSON.stringify(errors));
		}
	}
};

const sendThankYouEmail = async ({
	email,
	queueUrl,
	currency,
	firstName,
	identityId,
	amount,
}: {
	email: string;
	queueUrl: string;
	currency: string;
	firstName: string;
	identityId: string;
	amount: number;
}): Promise<void> => {
	await sendMessageToSqsQueue({
		queueUrl,
		messageBody: JSON.stringify({
			To: {
				Address: email,
				SubscriberKey: email,
				ContactAttributes: {
					SubscriberAttributes: {
						EmailAddress: email,
						edition: getEdition(currency),
						'payment method': 'credit / debit card',
						currency,
						amount: (amount / 100).toFixed(2),
						first_name: firstName,
						date_of_payment: formatToCustomDate(Date.now()),
					},
				},
			},
			DataExtensionName: 'contribution-thank-you',
			IdentityUserId: identityId,
		}),
	});
};

const saveRecordInContributionsStore = async ({
	queueUrl,
	paymentId,
	identityId,
	email,
	created,
	currency,
	amount,
	contributionId,
	country,
	postalCode,
	state,
}: {
	queueUrl: string;
	paymentId: string;
	identityId: string;
	email: string;
	created: string;
	currency: string;
	amount: number;
	contributionId: string;
	country: string | null;
	postalCode: string | null;
	state: string | null;
}): Promise<void> => {
	await sendMessageToSqsQueue({
		queueUrl,
		messageBody: JSON.stringify({
			newContributionData: {
				paymentProvider: 'Stripe',
				paymentStatus: 'Paid',
				paymentId,
				identityId,
				email,
				created,
				currency,
				amount: amount / 100,
				countryCode: country,
				countrySubdivisionCode: state,
				contributionId,
				postalCode,
			},
		}),
	});
};

const saveSoftOptInConsent = async ({
	queueUrl,
	identityId,
	contributionId,
}: {
	queueUrl: string;
	identityId: string;
	contributionId: string;
}): Promise<void> => {
	await sendMessageToSqsQueue({
		queueUrl,
		messageBody: JSON.stringify({
			subscriptionId: contributionId,
			identityId,
			eventType: 'Acquisition',
			productName: 'Contribution',
		}),
	});
};

const sendAcquisitionEvent = async ({
	eventBusName,
	event,
}: {
	eventBusName: string;
	event: AcquisitionEvent;
}) => {
	console.log(eventBusName);
	await putEvent({ eventBusName, event });
};

// const workInProgress = () => {
// 	const acquisitionPayload = {
// 		// eventTimeStamp: DateTime,
// 		// product: AcquisitionProduct,
// 		// amount: Option[BigDecimal],
// 		// country: Country,
// 		currency,
// 		// source: Option[String],
// 		// referrerUrl: Option[String],
// 		// abTests: List[AbTest],
// 		// paymentFrequency: PaymentFrequency,
// 		// paymentProvider: Option[PaymentProvider],
// 		identityId,
// 		// labels: List[String],
// 		// promoCode: Option[String],
// 		// reusedExistingPaymentMethod: Boolean,
// 		// readerType: ReaderType,
// 		// acquisitionType: AcquisitionType,
// 		// contributionId: Option[String],
// 		// paymentId: Option[String],
// 		// queryParameters: List[QueryParameter],
// 		// platform: Option[String],
// 		email,
// 	};
// 	console.info(acquisitionPayload);

// 	const supporterProductDataPayload = {
// 		identityId,
// 		subscriptionName: `Stripe - ${paymentId}`,
// 		productRatePlanId: 'single_contribution',
// 		productRatePlanName: 'Single Contribution',
// 	};
// 	console.info(supporterProductDataPayload);

// 	// Supporter data
// 	// case class SupporterRatePlanItem(
// 	// 	gifteeIdentityId: Option[String], // Unique identifier for user if this is a DS gift subscription
// 	// 	termEndDate: LocalDate, // Date that this subscription term ends
// 	// 	contractEffectiveDate: LocalDate, // Date that this subscription started
// 	// 	contributionAmount: Option[ContributionAmount],
// 	// )
// };
