import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import { prettyPrint } from '@modules/prettyPrint';
import type { SwitchInformation } from './switchInformation';

export type SalesforceTrackingInput = {
	subscriptionName: string;
	previousAmount: number;
	newAmount: number;
	previousProductName: string;
	previousRatePlanName: string;
	newRatePlanName: string;
	requestedDate: string;
	effectiveDate: string;
	paidAmount: number;
	csrUserId?: string;
	caseId?: string;
};

export function createSQSMessageBody(
	switchInformation: SwitchInformation,
	paidAmount: number,
	now: Date,
) {
	const {
		subscriptionNumber,
		previousProductName,
		previousRatePlanName,
		previousAmount,
	} = switchInformation.subscription;
	const { price, csrUserId, caseId } = switchInformation.input;

	const salesforceTrackingInput: SalesforceTrackingInput = {
		subscriptionName: subscriptionNumber,
		previousAmount,
		newAmount: price,
		previousProductName: previousProductName,
		previousRatePlanName: previousRatePlanName,
		newRatePlanName: 'Supporter Plus',
		requestedDate: now.toISOString().substring(0, 10),
		effectiveDate: now.toISOString().substring(0, 10),
		paidAmount,
		csrUserId: csrUserId,
		caseId: caseId,
	};
	return JSON.stringify(salesforceTrackingInput);
}

export const sendSalesforceTracking = async (
	paidAmount: number,
	switchInformation: SwitchInformation,
) => {
	const messageBody = createSQSMessageBody(
		switchInformation,
		paidAmount,
		new Date(),
	);

	const client = new SQSClient(awsConfig);
	const queueName = `product-switch-salesforce-tracking-${switchInformation.stage}`;
	console.log(
		`Sending Salesforce tracking message ${prettyPrint(
			JSON.parse(messageBody),
		)} to queue ${queueName}`,
	);
	const command = new SendMessageCommand({
		QueueUrl: queueName,
		MessageBody: messageBody,
	});

	const response = await client.send(command);
	console.log(
		`Response from Salesforce tracking send was ${prettyPrint(response)}`,
	);
	return response;
};
