import { z } from 'zod';
import {
	type ApiDefinition,
	ApiGatewayHandler,
} from '@modules/routing/apiGatewayHandler';
import { billingDateEndpoint } from './endpoints/billingDate';

export const configSchema = z.void();

export type EmailRemindersServices = Record<string, never>;

export const api: ApiDefinition<EmailRemindersServices> = {
	info: {
		title: 'Email reminders API',
		version: '0.1.0',
		description:
			'Receives Zuora callouts used to send reminder and notice emails to subscribers.',
	},
	routes: [billingDateEndpoint],
};

export const handler = ApiGatewayHandler(configSchema, api, () =>
	Promise.resolve({}),
);
