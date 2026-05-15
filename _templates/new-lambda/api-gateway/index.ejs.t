---
# This template creates the main index.ts file of the new lambda

to: handlers/<%=lambdaName%>/src/index.ts
sh: git add handlers/<%=lambdaName%>/src/index.ts
---
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import type { Handler } from 'aws-lambda';
import { testRequestEndpoint, testRequestSchema } from './testEndpoint';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/test',
		handler: withBodyParser(testRequestSchema, async (event, path, body) =>
			testRequestEndpoint(body),
		),
	},
]);




