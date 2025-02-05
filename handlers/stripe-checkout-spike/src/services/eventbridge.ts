import {
	EventBridgeClient,
	PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

export type AcquisitionEvent = {
	eventTimeStamp: string;
	product: string;
	amount: number;
	country: string | null;
	currency: string;
	componentId: null;
	componentType: null;
	campaignCode: string | null;
	source: null;
	referrerUrl: null;
	abTests: [];
	paymentFrequency: 'ONE_OFF';
	paymentProvider: 'STRIPE';
	printOptions: null;
	browserId: string | null;
	identityId: string;
	pageViewId: string | null;
	referrerPageViewId: string | null;
	labels: string[];
	promoCode: null;
	reusedExistingPaymentMethod: boolean;
	readerType: 'Direct';
	acquisitionType: 'Purchase';
	zuoraSubscriptionNumber: null;
	contributionId: string;
	paymentId: string;
	queryParameters: Array<{ name: string; value: string }>;
	platform: string;
	postalCode: string | null;
	state: string | null;
	email: string;
};

const client = new EventBridgeClient({ region: process.env.region });

export const putEvent = async ({
	eventBusName,
	event,
}: {
	eventBusName: string;
	event: AcquisitionEvent;
}) => {
	console.info('Acquisition event...');
	console.info(JSON.stringify(event));
	const input = {
		Entries: [
			{
				Source: 'stripe-checkout-spike',
				DetailType: 'AcquisitionsEvent',
				Detail: JSON.stringify(event),
				EventBusName: eventBusName,
			},
		],
	};
	const command = new PutEventsCommand(input);
	const response = await client.send(command);
	console.info(response);
};
