import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const stripeDisputesHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log('Received Stripe webhook event:', JSON.stringify(event, null, 2));

	try {
		const body = JSON.parse(event.body || '{}');
		const stripeEvent = body;

		console.log('Stripe event type:', stripeEvent.type);
		console.log(
			'Stripe event data:',
			JSON.stringify(stripeEvent.data, null, 2),
		);

		switch (stripeEvent.type) {
			case 'charge.dispute.created':
				console.log('Processing dispute created event');
				break;
			case 'charge.dispute.updated':
				console.log('Processing dispute updated event');
				break;
			case 'charge.dispute.closed':
				console.log('Processing dispute closed event');
				break;
			case 'charge.dispute.funds_reinstated':
				console.log('Processing dispute funds reinstated event');
				break;
			case 'charge.dispute.funds_withdrawn':
				console.log('Processing dispute funds withdrawn event');
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
