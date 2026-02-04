import { loadConfig } from '@modules/aws/appConfig';
import dayjs from 'dayjs';
import { ConfigSchema } from '../src/configSchema';
import { handlerWithStage } from '../src/indexSummary';

// to run this, get credentials for membership/targeting/mobile
// the output will go to chat channel P&E/SR/SRE
loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema)
	.then((config) => handlerWithStage({ now: dayjs(), stage: 'CODE', config }))
	.then(console.log)
	.catch(console.error);
