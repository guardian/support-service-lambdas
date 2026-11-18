import { createHash } from 'node:crypto';
import type { Context, Next } from 'hono';
import { mapValues } from '@modules/arrayFunctions';
import { logger } from '@modules/logger/logger';
import { safeJsonParse } from './withParsers';

const sensitiveName =
	/authorization|cookie|password|passwd|passphrase|secret|token|credential|session|api[-_]?key|private[-_]?key|^pwd$/i;

function omitBoringHeaders(headers: Headers) {
	return mapValues(Object.fromEntries(headers), (value, key) =>
		/^(cloudfront-|x-amz-)/i.test(String(key)) ? undefined : value,
	);
}

// hash any secret looking values for the logs
function fingerprint(value: unknown) {
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	return `[len:${text.length},sha256:${createHash('sha256')
		.update(text)
		.digest('hex')
		.slice(0, 12)}]`;
}

// traverse the tree, redacting anything secret looking
function redact(value: unknown, key?: string): unknown {
	if (value === undefined) {
		return value;
	}
	if (key !== undefined && sensitiveName.test(key)) {
		return fingerprint(value);
	}
	if (Array.isArray(value)) {
		return value.map((item: unknown) => redact(item));
	}
	if (value !== null && typeof value === 'object') {
		return mapValues(value, (item, name) => redact(item, name));
	}
	return value;
}

async function bodyForLogging(message: Request | Response): Promise<unknown> {
	try {
		const text = await message.clone().text();
		if (text === '') {
			return null;
		}
		const parsed = safeJsonParse(text);
		return parsed.success ? parsed.data : fingerprint(text);
	} catch (error) {
		logger.error('Failed to read HTTP body for logging', error);
		return '[body unavailable]';
	}
}

/*
 * Logs HTTP input before validation can reject it, then logs the final
 * response after downstream validation and error handling.
 * Keeps logger context available through the response trace and clears it afterwards.
 */
export function createHttpLogging(callerInfo: string) {
	return logger.withContext(
		async (c: Context, next: Next) => {
			const request = redact({
				pathParameters: c.req.param(),
				queryStringParameters: c.req.queries(),
				headers: omitBoringHeaders(c.req.raw.headers),
				body: await bodyForLogging(c.req.raw),
			});
			await logger.wrapFn(
				async (_request: unknown, c: Context, next: Next) => {
					await next();
					return redact({
						statusCode: c.res.status,
						headers: omitBoringHeaders(c.res.headers),
						body: await bodyForLogging(c.res),
					});
				},
				'httpRequest',
				callerInfo,
				([request, c]) => ({
					logOnEntryAndExit: `${c.req.method} ${c.req.path}`,
					logOnEntryOnly: [request],
				}),
			)(request, c, next);
		},
		undefined,
		true,
	);
}
