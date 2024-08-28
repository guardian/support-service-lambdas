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

export const handler: Handler = (event: SQSEvent) => {
	event.Records.flatMap(async (record) => {
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
			throw new Error(
				'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS.',
			);
		} else {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
			const userTypeResponse = await fetchUserType(email);
			if (userTypeResponse.userType === 'new') {
				createGuestAccount(email).catch(() => {
					throw new Error('Error creating guest account');
				});
			} else {
				console.log(
					`Skipping guest creation as user of type ${userTypeResponse.userType} exists already`,
				);
			}
		}
	});
};
