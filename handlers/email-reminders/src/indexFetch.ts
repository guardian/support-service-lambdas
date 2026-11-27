import { z } from 'zod';
import { uploadFileToS3 } from '@modules/aws/s3';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import {
	getEnv,
	LambdaHandlerWithServices,
} from '@modules/routing/lambdaHandler';
import { getBatchQueryFile, getBatchQueryJob } from '@modules/zuora/batchQuery';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { FetchServices } from './fetchResults';
import { fetchResults } from './fetchResults';
import type { FetchOutput } from './stepData';
import { queryOutputSchema } from './stepData';

export const handler = LambdaHandlerWithServices(
	z.void(),
	async (event: unknown, services: FetchServices): Promise<FetchOutput> =>
		fetchResults(queryOutputSchema.parse(event), services),
	async ({ stage }): Promise<FetchServices> => {
		const zuoraClient = await ZuoraClient.create(stage);
		const bucketName = getEnv('BUCKET_NAME');
		return {
			getJob: (jobId) => getBatchQueryJob(zuoraClient, jobId),
			getFile: (fileId) => getBatchQueryFile(zuoraClient, fileId),
			putFile: async (key, body) => {
				await uploadFileToS3({ bucketName, filePath: key, content: body });
			},
		};
	},
	getCallerInfo(),
);
