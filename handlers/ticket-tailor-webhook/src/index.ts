import { putMetric } from '@modules/aws/cloudwatch';
import { logger } from '@modules/routing/logger';
import type { SQSEvent } from 'aws-lambda';
import type { ApiGatewayToSqsEvent } from './apiGatewayToSqsEvent';
import { apiGatewayToSqsEventSchema } from './apiGatewayToSqsEvent';
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
		logger.log(
			`Skipping guest creation as account of type ${userTypeResponse.userType} already exists for user.`,
		);
	}
}

export const handler = async (event: SQSEvent): Promise<void> => {
	const eventualEnsuredIdentityAccount = event.Records.flatMap(
		async (sqsRecord) => {
			logger.log(
				`Processing TT Webhook. SQS Message id is: ${sqsRecord.messageId}`,
			);
			logger.log('record body', sqsRecord.body);
			const parsedEvent: ApiGatewayToSqsEvent =
				apiGatewayToSqsEventSchema.parse(JSON.parse(sqsRecord.body));

			const validRequest = await validateRequest(parsedEvent);
			if (validRequest) {
				await processValidSqsRecord(parsedEvent);
			} else {
				logger.error('Request failed validation. Processing terminated.');
				await putMetric('ticket-tailor-webhook-validation-failure');
				return;
			}
		},
	);

	await Promise.all<void>(eventualEnsuredIdentityAccount);
};
