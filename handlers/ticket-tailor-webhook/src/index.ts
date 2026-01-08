import { putMetric } from '@modules/aws/cloudwatch';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
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

async function processValidSqsRecord(
	sqsRecord: ApiGatewayToSqsEvent,
	stage: Stage,
) {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo use zod
	const ticketTailorRequest = JSON.parse(sqsRecord.body) as TicketTailorRequest;
	const email = ticketTailorRequest.payload.buyer_details.email;
	logger.mutableAddContext(email);
	const userTypeResponse = await fetchUserType(email, stage);

	if (userTypeResponse.userType === 'new') {
		await createGuestAccount(email, stage);
	} else {
		logger.log(
			`Skipping guest creation as account of type ${userTypeResponse.userType} already exists for user.`,
		);
	}
}

export async function handleSingleRecord(sqsRecord: SQSRecord, stage: Stage) {
	const parsedEvent: ApiGatewayToSqsEvent = apiGatewayToSqsEventSchema.parse(
		JSON.parse(sqsRecord.body),
	);

	const validRequest = await validateRequest(parsedEvent, stage);
	if (validRequest) {
		await processValidSqsRecord(parsedEvent, stage);
	} else {
		logger.error('Request failed validation. Processing terminated.');
		await putMetric('ticket-tailor-webhook-validation-failure', stage);
		return;
	}
}

export const handler = async (event: SQSEvent): Promise<void> => {
	const stage = stageFromEnvironment();

	const eventualEnsuredIdentityAccount = event.Records.flatMap(
		async (sqsRecord) => {
			logger.resetContext();
			logger.log(
				`Processing TT Webhook. SQS Message id is: ${sqsRecord.messageId}`,
			);
			logger.log('record body', sqsRecord.body);
			await handleSingleRecord(sqsRecord, stage);
		},
	);

	await Promise.all<void>(eventualEnsuredIdentityAccount);
};
