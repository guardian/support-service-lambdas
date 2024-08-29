import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { createGuestAccount, fetchUserType } from './idapiService';
import { validateRequest } from './validateRequest';

export type HmacKey = {
	secret: string;
};


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
	console.log(`fetching user type for email: ${email}.`);
	const userTypeResponse = await fetchUserType(email);
	console.log(
		`userTypeResponse for email: ${email} is: ${userTypeResponse.userType}`,
	);
	if (userTypeResponse.userType === 'new') {
		console.log(`Creating new guest account for user`);
		await createGuestAccount(email);
		console.log(`Guest account created for ${email}.`);
	} else {
		console.log(
			`Skipping guest creation as account of type ${userTypeResponse.userType} already exists for user.`,
		);
	}
}

export const handler = async (event: SQSEvent): Promise<void> => {
	const stage = stageFromEnvironment();
	const eventualEnsuredIdentityAccount = event.Records.flatMap(async (sqsRecord) => {
		console.log(
			`Processing TT Webhook. SQS Message id is: ${sqsRecord.messageId}`,
		);
		const validationSecret = await getSecretValue<HmacKey>(
			`${stage}/TicketTailor/Webhook-validation`,
		);
		const currentDateTime = new Date();
		const validRequest = validateRequest(
			sqsRecord,
			validationSecret,
			currentDateTime,
		);
		if (validRequest) {
			await processValidSqsRecord(sqsRecord);
		} else {
			console.error('Request failed validation. Processing terminated.');
			return;
		}
	});

	await Promise.all<void>(eventualEnsuredIdentityAccount);
};
