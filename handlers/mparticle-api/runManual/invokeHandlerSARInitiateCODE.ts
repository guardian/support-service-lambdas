import { invokeFunction } from '@modules/aws/lambda';
import { BatonSarEventInitiateRequest } from '../src/routers/baton/types-and-schemas';

const handlerTestEvent: BatonSarEventInitiateRequest = {
	dataProvider: 'mparticlesar',
	subjectEmail: 'my.user@theguardian.com', // fill in accordingly
	subjectId: '111111', // fill in accordingly
	requestType: 'SAR',
	action: 'initiate',
};

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction(
	'mparticle-api-baton-CODE',
	JSON.stringify(handlerTestEvent),
).then(console.log);
