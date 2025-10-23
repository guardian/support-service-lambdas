import type { Lazy } from '@modules/lazy';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { CognitoClient } from './cognitoClient';
import { cookieName } from './oAuth2CallbackHandler';
import type { ProxyTarget } from './proxyClient';
import { createDocsClient } from './proxyClient';

function getCookies(headers: Record<string, string | undefined>) {
	const normalised = Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
	);
	const rawCookies = normalised.cookie ?? '';
	const cookies: Record<string, string> = Object.fromEntries(
		rawCookies.split(';').map((c) => {
			const [name, ...rest] = c.split('=');
			const value = rest.join('=');
			return [(name ?? '').trim(), value.trim()];
		}),
	);
	return cookies;
}

export function proxyHandler(
	services: Lazy<{ stage: Stage; cognitoClient: CognitoClient }>,
) {
	return async (
		event: APIGatewayProxyEvent,
		parsed: { path: ProxyTarget },
	): Promise<APIGatewayProxyResult> => {
		const userRequestedPath =
			parsed.path.targetApp + '/' + parsed.path.targetPath;

		const cognitoRedirect = (
			await services.get()
		).cognitoClient.createCognitoRedirect(userRequestedPath);

		const auth = getCookies(event.headers)[cookieName];

		if (auth === undefined) {
			return cognitoRedirect(
				`No ${cookieName} cookie found, redirecting to Cognito for google auth`,
			);
		}

		// TODO: delete comment - Call the external docs endpoint via HTTP
		const upstreamClient = createDocsClient((await services.get()).stage);
		const upstreamResponse = await upstreamClient.get(parsed.path, {
			Authorization: `Bearer ${auth}`,
		});

		if (
			upstreamResponse.statusCode === 401 ||
			upstreamResponse.statusCode === 403
		) {
			logger.log('Authentication error from upstream endpoint', {
				statusCode: upstreamResponse.statusCode,
			});
			return cognitoRedirect('auth error from upstream');
		}

		return {
			statusCode: upstreamResponse.statusCode,
			headers: {
				'Content-Type': upstreamResponse.headers['content-type'] ?? 'text/html',
				'Cache-Control':
					upstreamResponse.headers['cache-control'] ?? 'max-age=60',
			},
			body: upstreamResponse.body,
		};
	};
}
