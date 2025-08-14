import { invokeFunction } from '@modules/aws/lambda';
import {
	BatonSarEventStatusRequest,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';

const initiationReference: InitiationReference =
	'8a6747ea-cef6-4b2d-8178-8bb81b13c4e9' as InitiationReference;

const handlerTestEvent: BatonSarEventStatusRequest = {
	initiationReference,
	requestType: 'SAR',
	action: 'status',
};

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction(
	'mparticle-api-baton-CODE',
	JSON.stringify(handlerTestEvent),
).then(console.log);
