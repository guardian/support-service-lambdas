import { invokeFunction } from '@modules/aws/lambda';
import {
	BatonSarEventStatusRequest,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';

const initiationReference: InitiationReference =
	'bdc701f6-0df0-441b-9ea3-0eccbe124e1f' as InitiationReference;

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
