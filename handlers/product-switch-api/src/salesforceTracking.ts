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
	requestedDate: Date;
	effectiveDate: Date;
	paidAmount: number;
	csrUserId?: string;
	caseId?: string;
};
export const sendSalesforceTracking = async (
	switchInformation: SwitchInformation,
	paidAmount: number,
) => {
	const queueName = `product-switch-salesforce-tracking-${switchInformation.stage}`;
	const client = new SQSClient(awsConfig);
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
		requestedDate: new Date(),
		effectiveDate: new Date(),
		paidAmount,
		csrUserId: csrUserId,
		caseId: caseId,
	};
	console.log(
		`Sending email message ${prettyPrint(
			salesforceTrackingInput,
		)} to queue ${queueName}`,
	);
	const command = new SendMessageCommand({
		QueueUrl: queueName,
		MessageBody: JSON.stringify(salesforceTrackingInput),
	});

	const response = await client.send(command);
	console.log(
		`Response from Salesforce tracking send was ${prettyPrint(response)}`,
	);
	return response;
};
