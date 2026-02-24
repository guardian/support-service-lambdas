import { runWithConfig } from '@modules/routing/lambdaHandler';
import { handler } from '../src/indexSummary';

// to run this, get credentials for membership/targeting/mobile
// the output will go to chat channel P&E/SR/SRE
runWithConfig(handler, undefined, 'alarms-handler');
