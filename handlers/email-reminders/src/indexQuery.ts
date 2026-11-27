import { z } from 'zod';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { LambdaHandlerWithServices } from '@modules/routing/lambdaHandler';
import { submitZoqlExport } from '@modules/zuora/batchQuery';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { QueryServices } from './queryZuora';
import { queryZuora } from './queryZuora';
import type { QueryOutput } from './stepData';
import { queryInputSchema } from './stepData';

export const handler = LambdaHandlerWithServices(
	z.void(),
	async (
		event: unknown,
		{ now, ...services }: QueryServices & Pick<HandlerEnv<void>, 'now'>,
	): Promise<QueryOutput> =>
		queryZuora(queryInputSchema.parse(event), now(), services),
	async ({ stage, now }) => {
		const zuoraClient = await ZuoraClient.create(stage);
		return {
			now,
			submitQuery: (name: string, query: string) =>
				submitZoqlExport(zuoraClient, name, query),
		};
	},
	getCallerInfo(),
);
