import { Lazy } from '@modules/lazy';
import { createRoute, Router } from '@modules/routing/router';
import type { Stage } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import type { CognitoClient } from './cognitoClient';
import { createCognitoClientFromConfig } from './cognitoClient';
import { oAuth2CallbackHandler } from './oAuth2CallbackHandler';
import { proxyHandler } from './proxy';
import type { ProxyTarget } from './upstreamApiClient';

const cognitoClient: Lazy<{ stage: Stage; cognitoClient: CognitoClient }> =
	new Lazy(
		() => createCognitoClientFromConfig(),
		'load config and create cognito client',
	);

// main entry point from AWS
export const handler: Handler = Router([
	createRoute<unknown, unknown>({
		httpMethod: 'GET',
		path: '/oauth2callback',
		handler: oAuth2CallbackHandler(cognitoClient),
	}),
	createRoute<ProxyTarget, unknown>({
		httpMethod: 'GET',
		path: '/{targetApp}/{targetPath+}',
		handler: proxyHandler(cognitoClient),
		parser: {
			path: z.object({
				targetApp: z.string().regex(/^[a-z-]{1,20}$/), // only accept reasonable values for the lambda name
				targetPath: z.string().regex(/^[/a-zA-Z0-9]{1,20}$/), // only really boring paths allowed
			}),
		},
	}),
]);
