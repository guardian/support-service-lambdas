import type { Stage } from '@modules/stage';
import type { Handler, SQSEvent } from 'aws-lambda';
import { getWebhookValidationSecret } from './getSecrets';
import { createGuestAccount, fetchUserType } from './idapiService';
import type { Payload } from './verifySignature';
import { hasMatchingSignature } from './verifySignature';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (event: SQSEvent) => {
	return await event.Records.flatMap(async (record) => {
		console.log(`Processing TT Webhook. Message id is: ${record.messageId}`);
		const validationSecret = await getWebhookValidationSecret(stage);
		const matches = hasMatchingSignature(record, validationSecret);
		if (!matches) {
			throw new Error(
				'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS.',
			);
		} else {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
			const userTypeResponse = await fetchUserType(email);
			if (userTypeResponse.userType === 'new') {
				return await createGuestAccount(email);
			} else {
				console.log(`Skipping guest creation as user of type ${userTypeResponse.userType} exists already`)
				return userTypeResponse;
			};	
		}
	}).at(0);
};
