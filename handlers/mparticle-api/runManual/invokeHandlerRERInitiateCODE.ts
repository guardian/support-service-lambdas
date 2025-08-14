import { invokeFunction } from '@modules/aws/lambda';
import { BatonRerEventInitiateRequest } from '../src/routers/baton/erasure/handleInitiate';

const handlerTestEvent: BatonRerEventInitiateRequest = {
	dataProvider: 'mparticlerer',
	subjectEmail: 'my.user@theguardian.com', // fill in accordingly
	subjectId: '111111', // fill in accordingly
	requestType: 'RER',
	action: 'initiate',
};

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction(
	'mparticle-api-baton-CODE',
	JSON.stringify(handlerTestEvent),
).then(console.log);
