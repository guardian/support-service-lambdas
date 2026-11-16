import { handle } from '@hono/aws-lambda';
import { createSrApi } from '@modules/routing/srApi';
import { cancelEndpoint } from './endpoints/cancel';
import { previewEndpoint } from './endpoints/preview';

export const app = createSrApi(
	{
		title: 'Cancellation API',
		version: '0.1.0',
		description: 'Preview and cancel subscriptions.',
	},
	[previewEndpoint, cancelEndpoint],
);

export const handler = handle(app);
