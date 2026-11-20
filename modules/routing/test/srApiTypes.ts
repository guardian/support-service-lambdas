import { createRoute, defineOpenAPIRoute, z } from '@hono/zod-openapi';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type ApiDefinition,
	ApiGatewayHandler,
	createSrApi,
} from '../src/apiGatewayHandler';
import { type JsonRequest, withJsonHandler } from '../src/withJsonHandler';
import { withSubscription } from '../src/withMMAIdentityCheck';

const info = { title: 'Type checks', version: '1.0.0' };

const route = createRoute({
	method: 'post',
	path: '/items/{itemId}',
	request: {
		params: z.object({ itemId: z.coerce.number().int() }),
		headers: z.object({ 'x-reference': z.string() }),
		body: {
			required: true,
			content: {
				'application/json': {
					schema: z.object({ confirmed: z.boolean() }),
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Cancellation',
			content: {
				'application/json': {
					schema: z.discriminatedUnion('type', [
						z.strictObject({
							type: z.literal('hard'),
							willRefund: z.boolean(),
						}),
						z.strictObject({
							type: z.literal('soft'),
							accessEndDate: z.iso.date(),
						}),
					]),
				},
			},
		},
	},
});

async function handler(
	_services: undefined,
	{ params, headers, body }: JsonRequest<typeof route>,
): Promise<{ type: 'hard'; willRefund: boolean }> {
	params.itemId.toFixed();
	headers['x-reference'].toUpperCase();
	// @ts-expect-error Only fields from the parsed parameter schema are available.
	const invalid: unknown = params.missing;
	void invalid;
	await Promise.resolve();
	return { type: 'hard', willRefund: body.confirmed };
}

const endpoint = defineOpenAPIRoute({
	route,
	handler: withJsonHandler(handler),
});

createSrApi({ info, routes: [endpoint] }, undefined);

const serviceEndpoint = defineOpenAPIRoute({
	route,
	handler: withJsonHandler(
		async (services: { label: string }, request: JsonRequest<typeof route>) => {
			services.label.toUpperCase();
			// @ts-expect-error Only declared services are available.
			const invalid: unknown = services.missing;
			void invalid;
			return Promise.resolve({
				type: 'hard' as const,
				willRefund: request.body.confirmed,
			});
		},
	),
});
const api: ApiDefinition<{ label: string }> = {
	info,
	routes: [serviceEndpoint],
};

const incompatibleApi: ApiDefinition<{ count: number }> = {
	info,
	// @ts-expect-error Endpoint services must be supplied by the app.
	routes: [serviceEndpoint],
};
void incompatibleApi;

// @ts-expect-error The app must receive the services required by its routes.
createSrApi(api, { count: 1 });

ApiGatewayHandler(z.object({ label: z.string() }), api, async ({ config }) =>
	Promise.resolve({ label: config.label }),
);

ApiGatewayHandler(
	z.void(),
	api,
	// @ts-expect-error The service builder must provide the services required by the API.
	async () => Promise.resolve({ count: 1 }),
);

const ownedHandler = withSubscription(
	async (
		services: { zuoraClient: ZuoraClient; label: string },
		request: {
			params: { subscriptionNumber: string };
			headers: { 'x-identity-id'?: string };
		},
	) => Promise.resolve(services.label + request.params.subscriptionNumber),
);
void ownedHandler;

defineOpenAPIRoute({
	route,
	// @ts-expect-error The JSON wrapper must preserve the declared response type.
	handler: withJsonHandler(async () =>
		Promise.resolve({ type: 'soft', accessEndDate: 123 }),
	),
});

const wrongParamsHandler = async (
	_services: undefined,
	request: { params: { itemId: string } },
) =>
	Promise.resolve({
		type: 'hard' as const,
		willRefund: request.params.itemId.length > 0,
	});

defineOpenAPIRoute({
	route,
	// @ts-expect-error Business functions must accept the parsed route parameter types.
	handler: withJsonHandler(wrongParamsHandler),
});

const missingSchemaEndpoint = defineOpenAPIRoute({
	route: createRoute({
		method: 'get',
		path: '/missing-schema',
		responses: { 200: { description: 'No schema' } },
	}),
	handler: async (c) => Promise.resolve(c.json({}, 200)),
});

const emptyRequest: JsonRequest<typeof missingSchemaEndpoint.route> = {
	params: undefined,
	headers: undefined,
	body: undefined,
};
void emptyRequest;

createSrApi(
	{
		info,
		// @ts-expect-error Shared response validation requires a JSON 200 Zod schema.
		routes: [missingSchemaEndpoint],
	},
	undefined,
);

ApiGatewayHandler(
	z.void(),
	{
		info,
		// @ts-expect-error The API Gateway wrapper must also require a JSON 200 Zod schema.
		routes: [missingSchemaEndpoint],
	},
	async () => Promise.resolve({}),
);
