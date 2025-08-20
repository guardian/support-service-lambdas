import { ConfigSchema } from '../src/services/config';
import { loadConfig } from '@modules/aws/appConfig';
import { MParticleClient } from '../src/services/mparticleClient';
import { BatonS3WriterImpl } from '../src/services/batonS3Writer';
import { InitiationReference } from '../src/routers/baton/initiationReference';
import { 
	handleSarStatus, 
	BatonSarEventStatusResponse 
} from '../src/routers/baton/access/handleStatus';

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

const sarS3BaseKey = 'handleSarStatusIntegrationTest/';
const sarResultsBucket = 'support-service-lambdas-test';

loadConfig('CODE', 'support', 'mparticle-api', ConfigSchema).then((config) => {
	const mParticleDataSubjectClient =
		MParticleClient.createMParticleDataSubjectClient(config.workspace);

	const batonS3Writer = new BatonS3WriterImpl(
		sarResultsBucket,
		sarS3BaseKey,
		() => new Date(),
	);

	handleSarStatus(
		mParticleDataSubjectClient,
		batonS3Writer,
		initiationReference,
	).then((out: BatonSarEventStatusResponse) => {
		console.log(out);
		const consoleUrl = `http://eu-west-1.console.aws.amazon.com/s3/buckets/${sarResultsBucket}?prefix=${sarS3BaseKey}`;
		console.log('check the results in the console', consoleUrl);
	});
});
