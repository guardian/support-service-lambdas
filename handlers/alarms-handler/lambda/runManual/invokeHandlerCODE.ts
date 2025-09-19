import { invokeFunction } from '@modules/aws/lambda';
import { handlerTestEvent } from './runHandler';

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction('alarms-handler-CODE', JSON.stringify(handlerTestEvent)).then(
	console.log,
);
