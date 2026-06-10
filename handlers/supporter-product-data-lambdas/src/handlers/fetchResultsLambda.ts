import { Lazy } from '@modules/lazy';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Handler } from 'aws-lambda';
import { ConfigService } from '../services/configService';
import { S3Service } from '../services/s3Service';
import { ZuoraQuerierService } from '../services/zuoraQuerierService';
import { fetchResults, type FetchResultsDependencies } from './fetchResults';
import type {
	AddSupporterRatePlanItemToQueueState,
	FetchResultsState,
} from './types';

const buildDependencies = async (): Promise<FetchResultsDependencies> => {
	const stage = stageFromEnvironment();
	const configService = new ConfigService(stage);
	const zuoraClient = await ZuoraClient.create(stage);
	const zuoraService = new ZuoraQuerierService(zuoraClient);
	const s3Service = new S3Service();

	return {
		getResults: (jobId) => zuoraService.getResults(jobId),
		getResultFileResponse: (fileId) =>
			zuoraService.getResultFileResponse(fileId),
		uploadToS3: (filename, body) => s3Service.streamToS3(stage, filename, body),
		putLastSuccessfulQueryTime: (time) =>
			configService.putLastSuccessfulQueryTime(time),
	};
};

const lazyDependencies = new Lazy<FetchResultsDependencies>(
	buildDependencies,
	'Building dependencies',
);

export const handler: Handler<
	FetchResultsState,
	AddSupporterRatePlanItemToQueueState
> = async (event) => {
	const dependencies = await lazyDependencies.get();
	return fetchResults(event, dependencies);
};
