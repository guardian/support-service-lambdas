import { handlerWithStage } from '../src/indexScheduled';
import dayjs from 'dayjs';
import { loadConfig } from '../src/config';

// to run this, get credentials for membership/trageting/mobile
// the output will go to chat channel P&E/SR Alarms CODE
loadConfig('CODE', 'support', 'alarms-handler')
	.then((config) => handlerWithStage(dayjs(), 'CODE', config))
	.then(console.log);
