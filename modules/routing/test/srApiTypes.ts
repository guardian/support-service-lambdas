import { createRoute, z } from '@hono/zod-openapi';
import { createSrApi } from '../src/srApi';

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

createSrApi(info, [
	{
		route,
		handler: ({ params, headers, body }) => {
			params.itemId.toFixed();
			headers['x-reference'].toUpperCase();
			return { type: 'hard', willRefund: body.confirmed };
		},
	},
]);

createSrApi(info, [
	{
		route,
		handler: async () => {
			await Promise.resolve();
			return { type: 'soft', accessEndDate: '2026-12-12' };
		},
	},
]);

createSrApi(info, [
	{
		route,
		handler: ({ params }) => {
			// @ts-expect-error Only fields from the parsed parameter schema are available.
			const invalid: unknown = params.missing;
			void invalid;
			return { type: 'hard', willRefund: false };
		},
	},
]);

createSrApi(info, [
	{
		route,
		// @ts-expect-error A hard cancellation must specify whether a refund is planned.
		handler: () => ({ type: 'hard' }),
	},
]);

createSrApi(info, [
	{
		route,
		// @ts-expect-error Async results must also match the declared 200 schema.
		handler: async () => Promise.resolve({ type: 'soft', accessEndDate: 123 }),
	},
]);

createSrApi(info, [
	{
		// @ts-expect-error A JSON 200 response with a Zod schema is mandatory.
		route: createRoute({
			method: 'get',
			path: '/missing-schema',
			responses: { 200: { description: 'No schema' } },
		}),
		handler: () => ({}),
	},
]);

createSrApi(info, [
	{
		route: createRoute({
			method: 'get',
			path: '/transformed-response',
			responses: {
				200: {
					description:
						'Defaults and transforms are applied by shared registration',
					content: {
						'application/json': {
							schema: z.object({
								count: z.string().transform(Number),
								confirmed: z.boolean().default(true),
							}),
						},
					},
				},
			},
		}),
		handler: () => ({ count: '12' }),
	},
]);

const invalidEndpoint = {
	route,
	handler: () => ({ type: 'hard' }),
};

// @ts-expect-error Separately declared handlers must also match the response schema.
createSrApi(info, [invalidEndpoint]);
