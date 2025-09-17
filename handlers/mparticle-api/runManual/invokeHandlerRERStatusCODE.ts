import { invokeFunction } from '@modules/aws/lambda';
import { InitiationReference } from '../src/routers/baton/initiationReference';
import { BatonRerEventStatusRequest } from '../src/routers/baton/erasure/handleStatus';

const initiationReference: InitiationReference =
	'9d3a0eb2-40c1-4fc5-a8c4-35e367005dd2' as InitiationReference;

const handlerTestEvent: BatonRerEventStatusRequest = {
	initiationReference,
	requestType: 'RER',
	action: 'status',
};

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction(
	'mparticle-api-baton-CODE',
	JSON.stringify(handlerTestEvent),
).then(console.log);
