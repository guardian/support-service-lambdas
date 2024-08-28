import { getSecretValue } from '@modules/secrets-manager/src/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import type { Handler, SQSEvent } from 'aws-lambda';
import { createGuestAccount, fetchUserType } from './idapiService';
import type { Payload } from './validateRequest';
import { validateRequest } from './validateRequest';

const stage = stageFromEnvironment();

export type HmacKey = {
	secret: string;
};

export const handler: Handler = async (event: SQSEvent): Promise<void> => {
	const results = event.Records.flatMap(async (record) => {
		console.log(`Processing TT Webhook. Message id is: ${record.messageId}`);
		const validationSecret = await getSecretValue<HmacKey>(
			`${stage}/TicketTailor/Webhook-validation`,
		);
		const currentDateTime = new Date();
		const validRequest = validateRequest(
			record,
			validationSecret,
			currentDateTime,
		);
		if (!validRequest) {
			console.error('Request failed validation. Processing terminated.');
		} else {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
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
	});

	await Promise.all<void>(results);
};
