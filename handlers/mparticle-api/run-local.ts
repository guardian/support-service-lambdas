// test-local.ts
import type { APIGatewayProxyEvent, Callback, Context } from 'aws-lambda';
import { handler } from './src/index';

const run = async ({
	httpMethod,
	path,
	body,
}: {
	httpMethod: 'GET' | 'POST';
	path: string;
	body?: string;
}) => {
	const result: unknown = await handler(
		{
			httpMethod,
			path,
			body,
		} as APIGatewayProxyEvent,
		{} as Context,
		(() => {}) as Callback<unknown>,
	);
	return result;
};
// run({
//     httpMethod: 'GET',
//     path: '/data-subject-requests/38689d80-4ae9-40f8-a628-b41077e3d62c'
// })
run({
	httpMethod: 'POST',
	path: '/events',
	body: JSON.stringify({
		events: [
			{
				data: {},
				eventType: 'commerce_event',
			},
		],
		deviceInfo: {},
		userAttributes: {},
		deletedUserAttributes: [],
		userIdentities: {},
		applicationInfo: {},
		schemaVersion: 2,
		environment: 'production',
		context: {},
		ip: '172.217.12.142',
	}),
})
	.then((response) => console.log(response))
	.catch((err) => console.error(err));
