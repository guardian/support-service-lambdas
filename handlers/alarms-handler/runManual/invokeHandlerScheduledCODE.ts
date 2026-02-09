import { invokeCODELambda } from '@modules/routing/lambdaHandler';
import { handlerTestEvent } from './invokeHandlerCODE';

// run this after deploying to CODE to invoke the deployed lambda
invokeCODELambda('alarms-handler-scheduled-CODE', handlerTestEvent);
