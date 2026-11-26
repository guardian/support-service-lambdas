import { z } from 'zod';
import { sendMessageToQueue } from '@modules/aws/sqs';
import {
	type ApiDefinition,
	ApiGatewayHandler,
} from '@modules/routing/apiGatewayHandler';
import { processorQueueName } from './billingDateMessage';
import { billingDateEndpoint } from './endpoints/billingDate';

export const configSchema = z.void();

export type EmailRemindersServices = {
	sendToProcessor: (messageBody: string) => Promise<unknown>;
};

export const api: ApiDefinition<EmailRemindersServices> = {
	info: {
		title: 'Email reminders API',
		version: '0.1.0',
		description:
			'Receives Zuora callouts used to send reminder and notice emails to subscribers.',
	},
	routes: [billingDateEndpoint],
};

export const handler = ApiGatewayHandler(configSchema, api, ({ stage }) =>
	Promise.resolve({
		sendToProcessor: (messageBody: string) =>
			sendMessageToQueue({ queueName: processorQueueName(stage), messageBody }),
	}),
);
