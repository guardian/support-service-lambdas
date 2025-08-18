import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface StripeEvent {
	id: string;
	type: string;
	data: {
		object: any;
	};
	created: number;
}

export const processDisputeCreated = async (
	disputeData: any,
): Promise<void> => {
	console.log('Processing dispute created:', disputeData);
	// TODO: Implement dispute created logic
};

export const processDisputeUpdated = async (
	disputeData: any,
): Promise<void> => {
	console.log('Processing dispute updated:', disputeData);
	// TODO: Implement dispute updated logic
};

export const processDisputeClosed = async (disputeData: any): Promise<void> => {
	console.log('Processing dispute closed:', disputeData);
	// TODO: Implement dispute closed logic
};

export const processDisputeFundsReinstated = async (
	disputeData: any,
): Promise<void> => {
	console.log('Processing dispute funds reinstated:', disputeData);
	// TODO: Implement dispute funds reinstated logic
};

export const processDisputeFundsWithdrawn = async (
	disputeData: any,
): Promise<void> => {
	console.log('Processing dispute funds withdrawn:', disputeData);
	// TODO: Implement dispute funds withdrawn logic
};

export const handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('Received Stripe webhook event:', JSON.stringify(event, null, 2));

	try {
		const body = JSON.parse(event.body || '{}');
		const stripeEvent: StripeEvent = body;

		console.log('Stripe event type:', stripeEvent.type);
		console.log(
			'Stripe event data:',
			JSON.stringify(stripeEvent.data, null, 2),
		);

		switch (stripeEvent.type) {
			case 'charge.dispute.created':
				await processDisputeCreated(stripeEvent.data.object);
				break;
			case 'charge.dispute.updated':
				await processDisputeUpdated(stripeEvent.data.object);
				break;
			case 'charge.dispute.closed':
				await processDisputeClosed(stripeEvent.data.object);
				break;
			case 'charge.dispute.funds_reinstated':
				await processDisputeFundsReinstated(stripeEvent.data.object);
				break;
			case 'charge.dispute.funds_withdrawn':
				await processDisputeFundsWithdrawn(stripeEvent.data.object);
				break;
			default:
				console.log(`Unhandled event type: ${stripeEvent.type}`);
		}

		return {
			statusCode: 200,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ received: true }),
		};
	} catch (error) {
		console.error('Error processing webhook:', error);
		return {
			statusCode: 400,
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ error: 'Invalid request' }),
		};
	}
};
