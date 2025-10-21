import { putMetric } from '@modules/aws/cloudwatch';
import { logger } from '@modules/routing/logger';
import type { SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import { createGuestAccount, fetchUserType } from './idapiService';
import { validateRequest } from './validateRequest';

/*
The payload of a webhook request contains an order object:
https://developers.tickettailor.com/?shell#get-a-single-order
*/
export interface TicketTailorRequest {
	payload: {
		buyer_details: {
			email: string;
		};
	};
}

async function processValidSqsRecord(sqsRecord: ApiGatewayToSqsEvent) {
	const ticketTailorRequest = JSON.parse(sqsRecord.body) as TicketTailorRequest;
	const email = ticketTailorRequest.payload.buyer_details.email;
	const userTypeResponse = await fetchUserType(email);

	if (userTypeResponse.userType === 'new') {
		await createGuestAccount(email);
	} else {
		console.log(
			`Skipping guest creation as account of type ${userTypeResponse.userType} already exists for user.`,
		);
	}
}

const apiGatewayToSqsEventSchema = z.object({
	pathParameters: z.record(z.string()),
	headers: z.record(z.string()),
	queryStringParameters: z.record(z.string()),
	body: z.string(),
	httpMethod: z.string(),
	path: z.string(),
});

export type ApiGatewayToSqsEvent = z.infer<typeof apiGatewayToSqsEventSchema>;

export const handler = async (event: SQSEvent): Promise<void> => {
	const eventualEnsuredIdentityAccount = event.Records.flatMap(
		async (sqsRecord) => {
			console.log(
				`Processing TT Webhook. SQS Message id is: ${sqsRecord.messageId}`,
			);
			logger.log('raw body is', sqsRecord.body);
			const parsedEvent: ApiGatewayToSqsEvent =
				apiGatewayToSqsEventSchema.parse(JSON.parse(sqsRecord.body));
			try {
				logger.log('body is', JSON.stringify(parsedEvent, undefined, 2));
			} catch (error) {
				console.log(error);
			}

			const validRequest = await validateRequest(parsedEvent);
			if (validRequest) {
				await processValidSqsRecord(parsedEvent);
			} else {
				console.error('Request failed validation. Processing terminated.');
				await putMetric('ticket-tailor-webhook-validation-failure');
				return;
			}
		},
	);

	await Promise.all<void>(eventualEnsuredIdentityAccount);
};
