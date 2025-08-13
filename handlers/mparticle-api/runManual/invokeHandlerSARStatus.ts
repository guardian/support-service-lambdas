import {
	BatonSarEventStatusRequest,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';
import { batonRerRouter } from '../src/routers/baton';
import { ConfigSchema } from '../src/utils/config';
import { loadConfig } from '@modules/aws/appConfig';
import { MParticleClientImpl } from '../src/apis/mparticleClient';
import { SRS3ClientImpl } from '../src/apis/srs3Client';

/*
This downloads an existing completed SAR into a bucket, so you can test
- get membership credentials
- update initiationReference
- run this
- check sarResultsBucket (support-service-lambdas-test)
 */
const initiationReference: InitiationReference =
	'6fd4c21e-a661-464b-8388-b09bf81604fc' as InitiationReference;

const handlerTestEvent: BatonSarEventStatusRequest = {
	initiationReference,
	requestType: 'SAR',
	action: 'status',
};

const sarS3BaseKey = 'handleSarStatusIntegrationTest/';
const sarResultsBucket = 'support-service-lambdas-test';

loadConfig('CODE', 'support', 'mparticle-api', ConfigSchema).then((config) => {
	const mParticleDataSubjectClient =
		MParticleClientImpl.createMParticleDataSubjectClient(config.workspace);
	const mParticleEventsAPIClient = MParticleClientImpl.createEventsApiClient(
		config.inputPlatform,
		config.pod,
	);

	const srs3Client = new SRS3ClientImpl(
		sarResultsBucket,
		sarS3BaseKey,
		() => new Date(0),
	);

	batonRerRouter(
		mParticleDataSubjectClient,
		mParticleEventsAPIClient,
		false,
		srs3Client,
	)
		.routeRequest(handlerTestEvent)
		.then((out) => {
			console.log(out);
			const consoleUrl = `http://eu-west-1.console.aws.amazon.com/s3/buckets/${sarResultsBucket}?prefix=${sarS3BaseKey}`;
			console.log('check the results in the console', consoleUrl);
		});
});
