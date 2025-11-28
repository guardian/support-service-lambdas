import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { RestClientImpl } from '@modules/zuora/restClient';
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
const tokenResponseSchema = z.object({
	id_token: z.string(),
	access_token: z.string(),
});
export type TokenResponseBody = z.infer<typeof tokenResponseSchema>;

export class CognitoClient {
	private readonly redirectUri: string;
	private readonly clientId: string;
	private readonly restClient: RestClientImpl<'CognitoClient'>;

	constructor(props: CognitoClientProps) {
		const baseUrl = `https://${props.cognitoDomain}.auth.eu-west-1.amazoncognito.com`;
		this.redirectUri = getAppBaseUrl(props.stage, app) + '/oauth2callback';
		this.clientId = props.clientId;
		const authorizationEncoded = Buffer.from(
			`${props.clientId}:${props.clientSecret}`,
		).toString('base64');
		const authHeader = {
			Authorization: `Basic ${authorizationEncoded}`,
		};
		this.restClient = new RestClientImpl(
			baseUrl,
			() => Promise.resolve(authHeader),
			'CognitoClient',
		);
	}

	getToken: (code: string) => Promise<TokenResponseBody> = async (code) => {
		const requestHeaders = {
			'Content-Type': 'application/x-www-form-urlencoded',
		};
		const requestBody = encodeParams({
			client_id: this.clientId,
			code,
			grant_type: 'authorization_code',
			redirect_uri: this.redirectUri,
		});

		return await this.restClient.post(
			`oauth2/token`,
			requestBody,
			tokenResponseSchema,
			requestHeaders,
		);
	};

	createCognitoRedirect =
		(state: string | undefined) =>
		(reason: string): APIGatewayProxyResult => {
			const urlParams = {
				response_type: 'code',
				client_id: this.clientId,
				redirect_uri: this.redirectUri,
				scope: 'email profile openid',
				identity_provider: 'Google',
				...(state ? { state } : {}),
			};

			const cognitoUrl =
				this.restClient.restServerUrl +
				`/oauth2/authorize?` +
				encodeParams(urlParams);

			return {
				statusCode: 302,
				headers: {
					Location: cognitoUrl,
				},
				body: 'redirecting to cognito due to <' + reason + '>',
			};
		};
}

const getEnv = (env: string): string =>
	getIfDefined(process.env[env], `${env} environment variable not set`);

export const repoConfigSchema = z.object({
	cognito: z.object({ clientSecret: z.string() }),
});
export type RepoConfig = z.infer<typeof repoConfigSchema>;

export async function createCognitoClientFromConfig() {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo fix in next refactor
	const stage = getEnv('STAGE') as Stage; // pass stuff in
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo fix in next refactor
	const stack = getEnv('STACK') as Stage; // pass stuff in
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo fix in next refactor
	const app = getEnv('APP') as Stage; // pass stuff in
	const cognitoDomain = getEnv('COGNITO_DOMAIN');
	const clientId = getEnv('COGNITO_CLIENT_ID');
	const config: RepoConfig = await loadConfig(
		stage,
		stack,
		app,
		repoConfigSchema,
	);
	const clientSecret = config.cognito.clientSecret;
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
