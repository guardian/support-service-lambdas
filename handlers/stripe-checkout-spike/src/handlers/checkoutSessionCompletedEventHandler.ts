import { type SQSEvent } from 'aws-lambda';
import type Stripe from 'stripe';
import { createGuestUser, getUser } from '../services/identity';
import { sendMessageToSqsQueue } from '../services/sqs';

export const handler = async (event: SQSEvent): Promise<void> => {
	try {
		for (const record of event.Records) {
			const body = JSON.parse(record.body) as {
				time: string;
				detail: Stripe.CheckoutSessionCompletedEvent;
			};

			console.log('Logging Stripe event...');
			console.log(JSON.stringify(body));

			const created = body.time;
			const session = body.detail.data.object;
			const email = session.customer_details?.email;
			const firstName = session.customer_details?.name;
			const currency = session.currency?.toUpperCase();
			const amount = session.amount_total;
			const paymentId =
				typeof session.payment_intent === 'string'
					? session.payment_intent
					: session.payment_intent?.id!;

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

			const { userId: identityId } = await getOrCreateGuestUser({
				email,
				firstName,
			});

			await sendThankYouEmail({
				email,
				queueUrl: process.env.BRAZE_EMAILS_QUEUE_URL,
				currency,
				firstName,
				identityId,
				amount,
			});

			await saveRecordInContributionsStore({
				queueUrl: process.env.CONTRIBUTIONS_STORE_QUEUE_URL,
				paymentId,
				identityId,
				email,
				created,
				currency,
				amount,
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

const getOrCreateGuestUser = async ({
	email,
	firstName,
}: {
	email: string;
	firstName: string;
}) => {
	const { user: existingUser } = await getUser({ email });

	if (existingUser) {
		return existingUser;
	} else {
		const { user: guestUser, errors } = await createGuestUser({
			email,
			firstName,
		});
		if (guestUser) {
			return guestUser;
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
}) => {
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
}: {
	queueUrl: string;
	paymentId: string;
	identityId: string;
	email: string;
	created: string;
	currency: string;
	amount: number;
}) => {
	await sendMessageToSqsQueue({
		queueUrl,
		messageBody: JSON.stringify({
			paymentProvider: 'Stripe',
			paymentStatus: 'Paid',
			paymentId,
			identityId,
			email,
			created,
			currency,
			amount: (amount / 100).toFixed(2),
			countryCode: '',
			countrySubdivisionCode: '',
			contributionId: crypto.randomUUID(),
			postalCode: '',
		}),
	});
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
// 	console.log(acquisitionPayload);

// 	const supporterProductDataPayload = {
// 		identityId,
// 		subscriptionName: `Stripe - ${paymentId}`,
// 		productRatePlanId: 'single_contribution',
// 		productRatePlanName: 'Single Contribution',
// 	};
// 	console.log(supporterProductDataPayload);

// 	// Supporter data
// 	// case class SupporterRatePlanItem(
// 	// 	gifteeIdentityId: Option[String], // Unique identifier for user if this is a DS gift subscription
// 	// 	termEndDate: LocalDate, // Date that this subscription term ends
// 	// 	contractEffectiveDate: LocalDate, // Date that this subscription started
// 	// 	contributionAmount: Option[ContributionAmount],
// 	// )
// };
