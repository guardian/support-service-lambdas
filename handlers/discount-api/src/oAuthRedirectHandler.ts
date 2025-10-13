import { loadRepoConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createDocsClient, getDocsBaseUrl } from './privateClient';
import { docsPath } from './index';

const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

async function cognitoGet(
	cognitoDomain: string,
	clientId: string,
	code: string,
	stage: Stage,
	clientSecret: string,
) {
	const data =
		`client_id=${clientId}` +
		`&code=${code}` +
		`&grant_type=authorization_code` +
		`&redirect_uri=${encodeURIComponent(getDocsBaseUrl(stage) + '/withRedirect')}`;

	const authorizationEncoded = Buffer.from(
		`${clientId}:${clientSecret}`,
	).toString('base64');
	const response = await fetch(
		`https://${cognitoDomain}.auth.eu-west-1.amazoncognito.com/oauth2/token`,
		{
			method: 'POST',
			body: data,
			headers: {
				Authorization: `Basic ${authorizationEncoded}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	);
	const body = await response.text();

	logger.log('Received response from docs endpoint', {
		url: 'TOKEN post',
		statusCode: response.status,
		headers: Object.fromEntries(response.headers.entries()),
		bodyLength: body.length,
		body,
	});

	return {
		body,
		statusCode: response.status,
		headers: Object.fromEntries(response.headers.entries()),
	};
}

export async function oAuthRedirectHandler(
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
	const stage = getEnv('STAGE') as Stage;
	const cognitoDomain = getEnv('COGNITO_DOMAIN');
	const clientId = getEnv('COGNITO_CLIENT_ID');
	const config = await loadRepoConfig(stage);
	const clientSecret = config.cognitoClientSecret;

	const cookieName = 'GU_STAFF_AUTH';

	let auth: string | undefined;
	let setCookie: string | undefined;
	if (!event.queryStringParameters?.code) {
		const cookies = event.headers.Cookie ?? event.headers.cookie ?? '';
		const authCookie = cookies
			.split(';')
			.find((cookie) => cookie.trim().startsWith(`${cookieName}=`))
			?.split('=')[1]
			?.trim();
		auth = authCookie;
	} else {
		logger.log(
			'got a code, TODO need to check it with cogito and set a cookie',
			event.queryStringParameters.code,
		);
		const result = await cognitoGet(
			cognitoDomain,
			clientId,
			event.queryStringParameters.code,
			stage,
			clientSecret,
		);
		logger.log('token response', result);
		auth = (
			JSON.parse(result.body) as { id_token: string; access_token: string }
		).id_token; //TODO types (also should be access token)
		setCookie = auth;
	}
	if (auth === undefined) {
		logger.log('No auth found, redirecting to Cognito');
		return createCognitoRedirect(cognitoDomain, clientId, event);
	}

	try {
		// TODO: delete comment - Call the external docs endpoint via HTTP
		const docsClient = createDocsClient(stage);
		const docsResponse = await docsClient.get(docsPath, {
			Authorization: `Bearer ${auth}`,
		});

		// TODO: delete comment - Check if response indicates auth failure
		if (docsResponse.statusCode === 401 || docsResponse.statusCode === 403) {
			logger.log('Authentication error from docs endpoint', {
				statusCode: docsResponse.statusCode,
			});
			return createCognitoRedirect(cognitoDomain, clientId, event);
		}

		return {
			statusCode: docsResponse.statusCode,
			headers: {
				'Content-Type': docsResponse.headers['content-type'] ?? 'text/html',
				'Cache-Control': docsResponse.headers['cache-control'] ?? 'max-age=60',
				...(setCookie ? { 'Set-Cookie': cookieName + '=' + setCookie } : {}),
			},
			body: docsResponse.body,
		};
	} catch (error) {
		logger.log('Error calling docs endpoint', { error });

		// TODO: delete comment - If it's an auth error (401), redirect to Cognito
		if (isAuthError(error)) {
			logger.log('Authentication error detected, redirecting to Cognito');
			return createCognitoRedirect(cognitoDomain, clientId, event);
		}

		// TODO: delete comment - For other errors, re-throw
		throw error;
	}
}

function isAuthError(error: unknown): boolean {
	// TODO: delete comment - Check if the error indicates authentication failure
	return (
		error instanceof Error &&
		(error.message.includes('401') ||
			error.message.includes('Unauthorized') ||
			error.message.includes('authentication') ||
			error.message.includes('403') ||
			error.message.includes('Forbidden'))
	);
}

function createCognitoRedirect(
	cognitoDomain: string,
	clientId: string,
	event: APIGatewayProxyEvent,
): APIGatewayProxyResult {
	// TODO: delete comment - Construct the callback URL (current request URL)
	const protocol = event.headers['X-Forwarded-Proto'] ?? 'https';
	const host = event.headers.Host;
	const callbackUrl = `${protocol}://${host}/withRedirect`;

	// TODO: delete comment - Construct Cognito OAuth URL
	const cognitoUrl =
		`https://${cognitoDomain}.auth.eu-west-1.amazoncognito.com/oauth2/authorize` +
		`?response_type=code` +
		`&client_id=${clientId}` +
		`&redirect_uri=${encodeURIComponent(callbackUrl)}` +
		`&scope=email+profile+openid` +
		`&identity_provider=Google`;

	return {
		statusCode: 302,
		headers: {
			Location: cognitoUrl,
		},
		body: '',
	};
}
