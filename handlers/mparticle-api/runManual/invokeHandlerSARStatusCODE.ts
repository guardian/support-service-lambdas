import { invokeFunction } from '@modules/aws/lambda';
import {
	BatonSarEventStatusRequest,
	InitiationReference,
} from '../src/routers/baton/types-and-schemas';

const initiationReference: InitiationReference =
	'6fd4c21e-a661-464b-8388-b09bf81604fc' as InitiationReference;

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
