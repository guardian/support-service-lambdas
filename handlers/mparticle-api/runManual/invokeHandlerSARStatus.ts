import {
	BatonSarEventStatusRequest,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';
import { batonRerRouter } from '../src/routers/baton';
import { ConfigSchema } from '../src/utils/config';
import { loadConfig } from '@modules/aws/appConfig';
import { MParticleClient } from '../src/apis/mparticleClient';
import { BatonS3WriterImpl } from '../src/apis/batonS3Writer';

/*
 **************************************************************************
 * This script downloads an existing completed SAR into a bucket, so you can test
 **************************************************************************
 *
 *	How to use:
 *	- get membership credentials
 *	- update initiationReference (get the value from mparticle console)
 *	- run this
 *	- check sarResultsBucket (support-service-lambdas-test)
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
		MParticleClient.createMParticleDataSubjectClient(config.workspace);
	const mParticleEventsAPIClient = MParticleClient.createEventsApiClient(
		config.inputPlatform,
		config.pod,
	);

	const dummyDate = () => new Date(0);
	const batonS3Writer = new BatonS3WriterImpl(
		sarResultsBucket,
		sarS3BaseKey,
		dummyDate,
	);

	batonRerRouter(
		//TODO call the child not the router
		mParticleDataSubjectClient,
		mParticleEventsAPIClient,
		false,
		batonS3Writer,
	)
		.routeRequest(handlerTestEvent)
		.then((out) => {
			console.log(out);
			const consoleUrl = `http://eu-west-1.console.aws.amazon.com/s3/buckets/${sarResultsBucket}?prefix=${sarS3BaseKey}`;
			console.log('check the results in the console', consoleUrl);
		});
});
