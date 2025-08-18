import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface DisputeObject {
	id: string;
	amount: number;
	currency: string;
	reason: string;
	status: string;
	charge: string;
	created: number;
	evidence_details?: {
		due_by: number;
		has_evidence: boolean;
		submission_count: number;
	};
	metadata?: Record<string, string>;
}

export interface StripeEvent {
	id: string;
	type: string;
	data: {
		object: DisputeObject;
	};
	created: number;
}

export const processDisputeCreated = (disputeData: DisputeObject): void => {
	console.log('Processing dispute created:', disputeData);
	// TODO: Implement dispute created logic
};

export const processDisputeUpdated = (disputeData: DisputeObject): void => {
	console.log('Processing dispute updated:', disputeData);
	// TODO: Implement dispute updated logic
};

export const processDisputeClosed = (disputeData: DisputeObject): void => {
	console.log('Processing dispute closed:', disputeData);
	// TODO: Implement dispute closed logic
};

export const processDisputeFundsReinstated = (
	disputeData: DisputeObject,
): void => {
	console.log('Processing dispute funds reinstated:', disputeData);
	// TODO: Implement dispute funds reinstated logic
};

export const processDisputeFundsWithdrawn = (
	disputeData: DisputeObject,
): void => {
	console.log('Processing dispute funds withdrawn:', disputeData);
	// TODO: Implement dispute funds withdrawn logic
};

export const handler = (event: APIGatewayProxyEvent): APIGatewayProxyResult => {
	console.log('Received Stripe webhook event:', JSON.stringify(event, null, 2));

	try {
		const body = JSON.parse(event.body ?? '{}') as StripeEvent;
		const stripeEvent: StripeEvent = body;

		console.log('Stripe event type:', stripeEvent.type);
		console.log(
			'Stripe event data:',
			JSON.stringify(stripeEvent.data, null, 2),
		);

		switch (stripeEvent.type) {
			case 'charge.dispute.created':
				processDisputeCreated(stripeEvent.data.object);
				break;
			case 'charge.dispute.updated':
				processDisputeUpdated(stripeEvent.data.object);
				break;
			case 'charge.dispute.closed':
				processDisputeClosed(stripeEvent.data.object);
				break;
			case 'charge.dispute.funds_reinstated':
				processDisputeFundsReinstated(stripeEvent.data.object);
				break;
			case 'charge.dispute.funds_withdrawn':
				processDisputeFundsWithdrawn(stripeEvent.data.object);
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
