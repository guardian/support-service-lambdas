import type { MaybeTemplateContent } from '../../../../../../types';

export default `import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import type { Handler } from 'aws-lambda';
import { helloRequestEndpoint, helloRequestSchema } from './helloEndpoint';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/hello',
		handler: withBodyParser(helloRequestSchema, async (event, path, body) =>
			helloRequestEndpoint(body),
		),
	},
]);
` satisfies MaybeTemplateContent;
