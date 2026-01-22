import { sendMessageToQueue } from '@modules/aws/sqs';
import { prettyPrint } from '@modules/prettyPrint';
import { logger } from '@modules/routing/logger';
import type { TargetInformation } from './changePlan/prepare/targetInformation';
import { ProductSwitchRequestBody } from './schemas';
import { Stage } from '@modules/stage';
import { SubscriptionInformation } from './changePlan/prepare/subscriptionInformation';

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
	targetInformation: TargetInformation,
	subscriptionInformation: SubscriptionInformation,
	input: ProductSwitchRequestBody,
	paidAmount: number,
	now: Date,
) {
	const {
		subscriptionNumber,
		previousProductName,
		previousRatePlanName,
		previousAmount,
	} = subscriptionInformation;

	const salesforceTrackingInput: SalesforceTrackingInput = {
		subscriptionName: subscriptionNumber,
		previousAmount,
		newAmount: targetInformation.actualTotalPrice,
		previousProductName: previousProductName,
		previousRatePlanName: previousRatePlanName,
		newRatePlanName: 'Supporter Plus',
		requestedDate: now.toISOString().substring(0, 10),
		effectiveDate: now.toISOString().substring(0, 10),
		paidAmount,
		csrUserId: input.csrUserId,
		caseId: input.caseId,
	};
	return JSON.stringify(salesforceTrackingInput);
}

export const sendSalesforceTracking = async (
	stage: Stage,
	input: ProductSwitchRequestBody,
	paidAmount: number,
	targetInformation: TargetInformation,
	subscriptionInformation: SubscriptionInformation,
) => {
	const messageBody = createSQSMessageBody(
		targetInformation,
		subscriptionInformation,
		input,
		paidAmount,
		new Date(),
	);

	const queueName = `product-switch-salesforce-tracking-${stage}`;
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
