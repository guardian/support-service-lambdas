import { sendMessageToQueue } from '@modules/aws/sqs';
import { prettyPrint } from '@modules/prettyPrint';
import { zuoraDateFormat } from '@modules/zuora/utils';
import dayjs from 'dayjs';
import type { SwitchInformation } from './switchInformation';

export type SupporterRatePlanItem = {
	subscriptionName: string; // Unique identifier for the subscription
	identityId: string; // Unique identifier for user
	productRatePlanId: string; // Unique identifier for the product in this rate plan
	productRatePlanName: string; // Name of the product in this rate plan
	termEndDate: string; // Date that this subscription term ends
	contractEffectiveDate: string; // Date that this subscription started
	contributionAmount?: ContributionAmount;
};

export type ContributionAmount = { amount: number; currency: string };

export const supporterRatePlanItemFromSwitchInformation = (
	switchInformation: SwitchInformation,
): SupporterRatePlanItem => {
	const productRatePlanName =
		switchInformation.subscription.billingPeriod == 'Month'
			? `Supporter Plus V2 - Monthly`
			: `Supporter Plus V2 - Annual`;

	return {
		subscriptionName: switchInformation.subscription.subscriptionNumber,
		identityId: switchInformation.account.identityId,
		productRatePlanId:
			switchInformation.catalog.supporterPlus.productRatePlanId,
		productRatePlanName,
		termEndDate: zuoraDateFormat(dayjs().add(1, 'year')),
		contractEffectiveDate: zuoraDateFormat(dayjs()),
	};
};

export const sendToSupporterProductData = async (
	switchInformation: SwitchInformation,
) => {
	const queueName = `supporter-product-data-${switchInformation.stage}`;
	const messageBody = prettyPrint(
		supporterRatePlanItemFromSwitchInformation(switchInformation),
	);
	console.log(
		`Sending supporter product data message ${messageBody} to queue ${queueName}`,
	);

	const response = await sendMessageToQueue({
		queueName,
		messageBody,
	});

	console.log(
		`Response from Salesforce tracking send was ${prettyPrint(response)}`,
	);
	return response;
};
