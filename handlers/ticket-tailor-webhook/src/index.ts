import type { Stage } from '@modules/stage';
import type { Handler, SQSEvent } from 'aws-lambda';
import { getWebhookValidationSecret } from './getSecrets';
import { createGuestAccount, fetchUserType } from './idapiService';
import type { Payload } from './validateRequest';
import { validateRequest } from './validateRequest';

const stage = process.env.STAGE as Stage;

export const handler: Handler = async (event: SQSEvent) => {
	const res = await event.Records.flatMap(async (record) => {
		console.log(`Processing TT Webhook. Message id is: ${record.messageId}`);
		const validationSecret = await getWebhookValidationSecret(stage);
		const currentDateTime = new Date();
		const validRequest = validateRequest(
			record,
			validationSecret,
			currentDateTime,
		);
		if (validRequest) {
			const payload = JSON.parse(record.body) as Payload;
			const email = payload.payload.buyer_details.email;
			const userTypeResponse = await fetchUserType(email);
			if (userTypeResponse.userType === 'new') {
				return await createGuestAccount(email);
			} else {
				return userTypeResponse;
			}
		} else {
			throw new Error(
				'Signatures do not match - check Ticket Tailor signing secret matches the one stored in AWS.',
			);
		}
	}).at(0);

	if (res) {
		return res;
	} else {
		throw new Error('Unknown Error');
	}
};
