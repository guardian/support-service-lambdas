import { sendMessageToQueue } from '@modules/aws/sqs';
import { prettyPrint } from '@modules/prettyPrint';
import type { Logger } from '@modules/routing/logger';
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

	const salesforceTrackingInput: SalesforceTrackingInput = {
		subscriptionName: subscriptionNumber,
		previousAmount,
		newAmount: switchInformation.actualTotalPrice,
		previousProductName: previousProductName,
		previousRatePlanName: previousRatePlanName,
		newRatePlanName: 'Supporter Plus',
		requestedDate: now.toISOString().substring(0, 10),
		effectiveDate: now.toISOString().substring(0, 10),
		paidAmount,
		csrUserId: switchInformation.input.csrUserId,
		caseId: switchInformation.input.caseId,
	};
	return JSON.stringify(salesforceTrackingInput);
}

export const sendSalesforceTracking = async (
	logger: Logger,
	paidAmount: number,
	switchInformation: SwitchInformation,
) => {
	const messageBody = createSQSMessageBody(
		switchInformation,
		paidAmount,
		new Date(),
	);

	const queueName = `product-switch-salesforce-tracking-${switchInformation.stage}`;
	logger.log(
		`Sending Salesforce tracking message ${prettyPrint(
			JSON.parse(messageBody),
		)} to queue ${queueName}`,
	);

	const response = await sendMessageToQueue({
		queueName,
		messageBody,
	});

	logger.log(
		`Response from Salesforce tracking send was ${prettyPrint(response)}`,
	);
	return response;
};
