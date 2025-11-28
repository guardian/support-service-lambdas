import type { Lazy } from '@modules/lazy';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { CognitoClient, TokenResponseBody } from './cognitoClient';
import { app, getAppBaseUrl } from './getAppBaseUrl';

export const cookieName = 'GU_STAFF_AUTH';

export function oAuth2CallbackHandler(
	services: Lazy<{ stage: Stage; cognitoClient: CognitoClient }>,
) {
	return async (event: APIGatewayProxyEvent) => {
		const { cognitoClient, stage } = await services.get();

		// note - this state has potentially come from an untrusted source
		// however if they redirect elsewhere, the cookie won't be set
		const untrustedRelativePath = event.queryStringParameters?.state;

		const authCode = event.queryStringParameters?.code;
		if (!authCode) {
			return cognitoClient.createCognitoRedirect(untrustedRelativePath)(
				'no code in url params',
			);
		}

		logger.log('got auth code, fetch token from cognito then set a cookie');
		const result: TokenResponseBody = await cognitoClient.getToken(authCode);

		const maybeLocationHeader = buildMaybeLocationHeader(
			stage,
			untrustedRelativePath,
		);

		return {
			statusCode: maybeLocationHeader ? 302 : 200,
			headers: {
				...maybeLocationHeader,
				'Cache-Control': 'no-cache, private',
				'Set-Cookie': buildAuthCookie(result.id_token), // currently use id_token because we're not using scopes
			},
			body:
				'Successfully logged in - ' +
				(maybeLocationHeader
					? maybeLocationHeader.Location
					: 'no onwards redirect url in the state'),
		} satisfies APIGatewayProxyResult;
	};
}

function buildAuthCookie(token: string) {
	const sendWithGetRequestsOnly = `SameSite=Lax`;
	const hideFromClientSide = `HttpOnly`;
	const setCookie = [
		`${cookieName}=${token}`,
		'Secure',
		hideFromClientSide,
		sendWithGetRequestsOnly,
		'Path=/',
	];
	return setCookie.join('; ');
}

function buildMaybeLocationHeader(
	stage: Stage,
	untrustedRelativePath: string | undefined,
): { Location: string } | undefined {
	const ourBaseUrl = getAppBaseUrl(stage, app);
	const Location = untrustedRelativePath
		? ourBaseUrl + '/' + untrustedRelativePath
		: undefined;

	return Location ? { Location } : undefined;
}
