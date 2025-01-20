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
			const currency = session.currency?.toUpperCase();

			if (!email) {
				throw new Error('Customer email not present in event');
			}
			if (!firstName) {
				throw new Error('Firstname not present in event');
			}
			if (!currency) {
				throw new Error('Currency not present in event');
			}
			if (!process.env.IDENTITY_API_URL) {
				throw new Error('Identity API URL not found in environment variables');
			}
			if (!process.env.BRAZE_EMAILS_QUEUE_URL) {
				throw new Error('Braze queue URL not found in environment variables');
			}

			const { user: existingUser } = await getUser({ email });

			let identityId;

			if (existingUser) {
				identityId = existingUser.userId;
			} else {
				const { user: guestUser, errors } = await createGuestUser({
					email,
					firstName,
				});
				if (guestUser) {
					identityId = guestUser.userId;
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
								edition: getEdition(currency),
								'payment method': 'credit / debit card',
								currency,
								amount: (session.amount_total! / 100).toFixed(2),
								first_name: firstName,
								date_of_payment: formatToCustomDate(Date.now()),
							},
						},
					},
					DataExtensionName: 'contribution-thank-you',
					IdentityUserId: identityId,
				}),
			});

			const eventPayload = {
				// eventTimeStamp: DateTime,
				// product: AcquisitionProduct,
				// amount: Option[BigDecimal],
				// country: Country,
				currency,
				// source: Option[String],
				// referrerUrl: Option[String],
				// abTests: List[AbTest],
				// paymentFrequency: PaymentFrequency,
				// paymentProvider: Option[PaymentProvider],
				identityId,
				// labels: List[String],
				// promoCode: Option[String],
				// reusedExistingPaymentMethod: Boolean,
				// readerType: ReaderType,
				// acquisitionType: AcquisitionType,
				// contributionId: Option[String],
				// paymentId: Option[String],
				// queryParameters: List[QueryParameter],
				// platform: Option[String],
				email,
			};
			console.log(eventPayload);

			const supporterProductDataPayload = {
				identityId,
				subscriptionName: `Stripe - ${typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id}`,
				productRatePlanId: 'single_contribution',
				productRatePlanName: 'Single Contribution',
			};
			console.log(supporterProductDataPayload);

			// Supporter data
			// case class SupporterRatePlanItem(
			// 	gifteeIdentityId: Option[String], // Unique identifier for user if this is a DS gift subscription
			// 	termEndDate: LocalDate, // Date that this subscription term ends
			// 	contractEffectiveDate: LocalDate, // Date that this subscription started
			// 	contributionAmount: Option[ContributionAmount],
			// )
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
