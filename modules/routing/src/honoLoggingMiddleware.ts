import { logger } from '@modules/logger/logger';
import { objectEntries } from '@modules/objectFunctions';
import { createMiddleware } from 'hono/factory';

export const honoLoggingMiddleware = createMiddleware(async (c, next) => {
	logger.resetContext();

	const { method } = c.req;
	const url = new URL(c.req.url);
	const path = url.pathname;

	const rawHeaders = Object.fromEntries(c.req.raw.headers.entries());
	const filteredHeaders = objectEntries(rawHeaders).filter(
		([key]) =>
			!key.toLowerCase().startsWith('cloudfront-') &&
			!key.toLowerCase().startsWith('x-amz-'),
	);

	// Clone to avoid consuming the body stream before the route handler reads it
	const bodyText = await c.req.raw.clone().text();

	logger.log(`${method} ${path}`, {
		pathParameters: c.req.param(),
		body: bodyText || null,
		queryStringParameters: c.req.queries(),
		headers: filteredHeaders,
	});

	try {
		await next();
	} finally {
		logger.log(`${method} ${path} -> ${c.res.status}`);
		logger.resetContext();
	}
});
