import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { awsConfig } from '@modules/aws/config';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { ProductCatalogHelper } from '@modules/product-catalog/productCatalog';
import type { Stage } from '@modules/stage';
import { zuoraDateFormat } from '@modules/zuora/common';
import { getActiveAccountNumbersForIdentityId } from '@modules/zuora/getAccountsForIdentityId';
import { getSubscriptionsByAccountNumber } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { RatePlan, ZuoraSubscription } from '@modules/zuora/zuoraSchemas';
import dayjs from 'dayjs';

type MessageBody = {
	subscriptionName: string;
	identityId: string;
	gifteeIdentityId: string | null;
	productRatePlanId: string;
	productRatePlanName: string;
	termEndDate: string;
	contractEffectiveDate: string;
	contributionAmount: number | null;
};

void (async () => {
	const stage = process.argv[2];
	if (stage !== 'CODE' && stage !== 'PROD') {
		console.log('Please provide a valid stage');
		return;
	}
	const identityId = process.argv[3];
	if (!identityId) {
		console.log('Please provide a valid identityId');
		return;
	}
	const client = await ZuoraClient.create(stage);
	console.log('Fetching product catalog');
	const productCatalogHelper = new ProductCatalogHelper(
		await getProductCatalogFromApi(stage),
	);
	console.log('Finding active accounts for user with identityId', identityId);
	const accountNumbers = await getActiveAccountNumbersForIdentityId(
		client,
		identityId,
	);
	const subscriptions = (
		await Promise.all(
			accountNumbers.map((accountNumber) =>
				getSubscriptionsByAccountNumber(client, accountNumber),
			),
		)
	)
		.flat()
		.filter((subscription) => subscription.status === 'Active');
	const messageBodies = subscriptions
		.map((subscription) =>
			getValidRatePlansFromSubscription(productCatalogHelper, subscription).map(
				(ratePlan) => createMessageBody(identityId, subscription, ratePlan),
			),
		)
		.flat();

	await Promise.all(
		messageBodies.map((messageBody) => sendToQueue(stage, messageBody)),
	);
})();

const getValidRatePlansFromSubscription = (
	productCatalogHelper: ProductCatalogHelper,
	subscription: ZuoraSubscription,
): RatePlan[] =>
	subscription.ratePlans.filter(
		(ratePlan) =>
			ratePlan.lastChangeType !== 'RemoveProduct' &&
			productCatalogHelper.findProductDetails(ratePlan.productRatePlanId) !==
				undefined,
	);

const createMessageBody = (
	identityId: string,
	subscription: ZuoraSubscription,
	ratePlan: RatePlan,
): MessageBody => {
	return {
		subscriptionName: subscription.subscriptionNumber,
		identityId: identityId,
		gifteeIdentityId: null,
		productRatePlanId: ratePlan.productRatePlanId,
		productRatePlanName: ratePlan.ratePlanName,
		termEndDate: zuoraDateFormat(dayjs(subscription.termEndDate)),
		contractEffectiveDate: zuoraDateFormat(
			dayjs(subscription.contractEffectiveDate),
		),
		contributionAmount: null,
	};
};

const sendToQueue = async (stage: Stage, message: MessageBody) => {
	const queueName = `supporter-product-data-${stage}`;
	const client = new SQSClient(awsConfig);
	console.log(
		`Sending message ${JSON.stringify(message)} to queue ${queueName}`,
	);
	const command = new SendMessageCommand({
		QueueUrl: queueName,
		MessageBody: JSON.stringify(message),
	});
	const response = await client.send(command);
	console.log(`Response from message send was ${JSON.stringify(response)}`);
	return response;
};
