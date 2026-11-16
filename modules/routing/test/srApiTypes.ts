import { createRoute, z } from '@hono/zod-openapi';
import { defineSrRoute } from '../src/srApi';

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

defineSrRoute({
	route,
	logContext: ({ params, headers }) =>
		`${params.itemId.toFixed()}:${headers['x-reference']}`,
	handler: ({ body }) => ({ type: 'hard', willRefund: body.confirmed }),
});

defineSrRoute({
	route,
	logContext: undefined,
	handler: async () => {
		await Promise.resolve();
		return { type: 'soft', accessEndDate: '2026-12-12' };
	},
});

defineSrRoute({
	route,
	logContext: ({ params }) => {
		// @ts-expect-error Only fields from the parsed parameter schema are available.
		const invalid: unknown = params.missing;
		void invalid;
		return String(params.itemId);
	},
	handler: () => ({ type: 'hard', willRefund: false }),
});

defineSrRoute({
	route,
	logContext: undefined,
	// @ts-expect-error A hard cancellation must specify whether a refund is planned.
	handler: () => ({ type: 'hard' }),
});

defineSrRoute({
	route,
	logContext: undefined,
	// @ts-expect-error Async results must also match the declared 200 schema.
	handler: async () => Promise.resolve({ type: 'soft', accessEndDate: 123 }),
});

defineSrRoute({
	// @ts-expect-error A JSON 200 response with a Zod schema is mandatory.
	route: createRoute({
		method: 'get',
		path: '/missing-schema',
		responses: { 200: { description: 'No schema' } },
	}),
	logContext: undefined,
	handler: () => ({}),
});
