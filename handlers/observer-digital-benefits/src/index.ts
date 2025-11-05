import { createRoute, Router } from '@modules/routing/router';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import z from 'zod';

const pathSchema = z.object({
	subscriptionNumber: z
		.string()
		.regex(
			/^A-S\d+$/,
			'Subscription number must start with A-S and be followed by digits',
		),
});
type ParsedPath = z.infer<typeof pathSchema>;

export const handler: Handler = Router([
	createRoute({
		httpMethod: 'GET',
		path: '/status/{subscriptionNumber}',
		handler: handleRequest,
		parser: {
			path: pathSchema,
		},
	}),
]);

async function handleRequest(
	event: APIGatewayProxyEvent,
	parsed: {
		path: ParsedPath;
	},
): Promise<APIGatewayProxyResult> {
	console.log(`Checking status for ${parsed.path.subscriptionNumber}`);

	return await Promise.resolve({
		body: `Hello ${parsed.path.subscriptionNumber}`,
		statusCode: 200,
	});
}
