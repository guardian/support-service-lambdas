import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { createGuestAccount, fetchUserType } from './idapiService';
import { validateRequest } from './validateRequest';
import {putMetric} from "./cloudwatch";

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

async function processValidSqsRecord(sqsRecord: SQSRecord) {
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

export const handler = async (event: SQSEvent): Promise<void> => {
	const eventualEnsuredIdentityAccount = event.Records.flatMap(
		async (sqsRecord) => {
			console.log(
				`Processing TT Webhook. SQS Message id is: ${sqsRecord.messageId}`,
			);

			const validRequest = await validateRequest(sqsRecord);
			if (validRequest) {
				await processValidSqsRecord(sqsRecord);
			} else {
				await putMetric('ticket-tailor-webhook-validation-failure');
				console.error('Request failed validation. Processing terminated.');
				return;
			}
		},
	);

	await Promise.all<void>(eventualEnsuredIdentityAccount);
};
