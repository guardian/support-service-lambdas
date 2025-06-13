import { invokeFunction } from '@modules/aws/lambda';

// run this after deploying to CODE to invoke the deployed lambda
invokeFunction('alarms-handler-scheduled-CODE', '').then(console.log);
