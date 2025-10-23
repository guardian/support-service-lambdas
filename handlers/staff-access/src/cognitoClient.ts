import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { app, getAppBaseUrl } from './getAppBaseUrl';

interface CognitoClientProps {
	cognitoDomain: string;
	clientId: string;
	stage: Stage;
	clientSecret: string;
}

function encodeParams(urlParams: Record<string, string>) {
	return Object.entries(urlParams)
		.map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
		.join('&');
}

export class CognitoClient {
	private readonly redirectUri: string;
	private readonly cognitoBaseUrl: string;
	private readonly clientId: string;
	private readonly authHeader: string;
	constructor(props: CognitoClientProps) {
		this.redirectUri = getAppBaseUrl(props.stage, app) + '/oauth2callback';
		this.cognitoBaseUrl = `https://${props.cognitoDomain}.auth.eu-west-1.amazoncognito.com`;
		this.clientId = props.clientId;
		const authorizationEncoded = Buffer.from(
			`${props.clientId}:${props.clientSecret}`,
		).toString('base64');
		this.authHeader = `Basic ${authorizationEncoded}`;
	}

	getToken = logger.wrapFn(
		this.getWithoutLogging.bind(this),
		() => `HTTP ${this.cognitoBaseUrl} ${this.clientId}`,
		this.getWithoutLogging.toString(),
		2,
		logger.getCallerInfo(),
	);

	private async getWithoutLogging(code: string) {
		const url = this.cognitoBaseUrl + `/oauth2/token`;
		const requestHeaders = {
			Authorization: this.authHeader,
			'Content-Type': 'application/x-www-form-urlencoded',
		};
		const requestBody = encodeParams({
			client_id: this.clientId,
			code,
			grant_type: 'authorization_code',
			redirect_uri: this.redirectUri,
		});

		const fetchInput = {
			method: 'POST',
			body: requestBody,
			headers: requestHeaders,
		};

		logger.log('Request: ' + url, fetchInput);

		const response = await fetch(url, fetchInput);

		const responseBody = await response.text();
		const responseHeaders = Object.fromEntries(response.headers.entries());
		const statusCode = response.status;
		if (!`${statusCode}`.startsWith('2')) {
			throw new Error(
				'HTTP call failed: ' + statusCode + ' body: ' + responseBody,
			);
		}

		return { body: responseBody, statusCode, headers: responseHeaders };
	}

	createCognitoRedirect =
		(state: string | undefined) =>
		(reason: string): APIGatewayProxyResult => {
			logger.log('redirecting - ' + reason);

			const urlParams = {
				response_type: 'code',
				client_id: this.clientId,
				redirect_uri: this.redirectUri,
				scope: 'email profile openid',
				identity_provider: 'Google',
				...(state ? { state } : {}),
			};

			const cognitoUrl =
				this.cognitoBaseUrl + `/oauth2/authorize?` + encodeParams(urlParams);

			return {
				statusCode: 302,
				headers: {
					Location: cognitoUrl,
				},
				body: reason,
			};
		};
}

const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const repoConfigSchema = z.object({
	cognitoClientSecret: z.string(),
	googleOAuthClientId: z.string(),
	googleOAuthClientSecret: z.string(),
});
export type RepoConfig = z.infer<typeof repoConfigSchema>;

export async function createCognitoClientFromConfig() {
	const stage = getEnv('STAGE') as Stage; // pass stuff in
	const stack = getEnv('STACK') as Stage; // pass stuff in
	const app = getEnv('APP') as Stage; // pass stuff in
	const cognitoDomain = getEnv('COGNITO_DOMAIN');
	const clientId = getEnv('COGNITO_CLIENT_ID');
	const config: RepoConfig = await loadConfig(
		stage,
		stack,
		app,
		repoConfigSchema,
	);
	const clientSecret = config.cognitoClientSecret;
	return {
		stage,
		cognitoClient: new CognitoClient({
			stage,
			cognitoDomain,
			clientId,
			clientSecret,
		}),
	};
}
