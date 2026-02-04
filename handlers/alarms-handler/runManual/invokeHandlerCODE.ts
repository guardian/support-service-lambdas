import { invokeFunction } from '@modules/aws/lambda';
import type { SQSEvent } from 'aws-lambda';
import { handlerTestRecord } from './runHandler';

const handlerTestEvent: SQSEvent = {
	Records: [handlerTestRecord],
};

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction('alarms-handler-CODE', JSON.stringify(handlerTestEvent))
	.then(console.log)
	.catch(console.error);
