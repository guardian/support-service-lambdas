import { sendMessageToQueue } from '@modules/aws/sqs';
import { logger } from '@modules/logger/logger';
import { prettyPrint } from '@modules/prettyPrint';
import type { Stage } from '@modules/stage';

async function sendSoftOptInConsent(
	stage: Stage,
	identityId: string,
	subscriptionId: string,
	eventType: 'Acquisition' | 'Cancellation',
) {
	const queueName = `soft-opt-in-consent-setter-queue-${stage}`;

	const messageBody = prettyPrint({
		productName: 'SECONDARY_USER',
		eventType,
		identityId,
		subscriptionId,
	});
	logger.log(
		`Sending soft opt-in consent message ${messageBody} to queue ${queueName}`,
	);

	const response = await sendMessageToQueue({
		queueName,
		messageBody,
	});

	logger.log(
		`Response from soft opt-in consent message send was ${prettyPrint(response)}`,
	);
	return response;
}

export async function sendSoftOptInAcquisitionEvent(
	stage: Stage,
	identityId: string,
	subscriptionId: string,
) {
	return sendSoftOptInConsent(stage, identityId, subscriptionId, 'Acquisition');
}

export async function sendSoftOptInCancelEvent(
	stage: Stage,
	identityId: string,
	subscriptionId: string,
) {
	return sendSoftOptInConsent(
		stage,
		identityId,
		subscriptionId,
		'Cancellation',
	);
}
