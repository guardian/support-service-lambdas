import { loadConfig } from '@modules/aws/appConfig';
import { getIfDefined } from '@modules/nullAndUndefined';
import type { Stage } from '@modules/stage';
import { RestClient } from '@modules/zuora/restClient';
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
type TokenResponseBody = z.infer<typeof tokenResponseSchema>;

export class CognitoClient extends RestClient {
	private readonly redirectUri: string;
	private readonly clientId: string;
	private readonly authHeader: string;

	constructor(props: CognitoClientProps) {
		super(`https://${props.cognitoDomain}.auth.eu-west-1.amazoncognito.com`);
		this.redirectUri = getAppBaseUrl(props.stage, app) + '/oauth2callback';
		this.clientId = props.clientId;
		const authorizationEncoded = Buffer.from(
			`${props.clientId}:${props.clientSecret}`,
		).toString('base64');
		this.authHeader = `Basic ${authorizationEncoded}`;
	}

	protected getAuthHeaders = (): Promise<Record<string, string>> =>
		Promise.resolve({
			Authorization: this.authHeader,
		});

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

		return await this.post(
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
				this.restServerUrl + `/oauth2/authorize?` + encodeParams(urlParams);

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
