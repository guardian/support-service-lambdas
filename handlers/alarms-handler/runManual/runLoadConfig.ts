import { ConfigSchema } from '../src/config';
import { loadConfig } from '@modules/aws/appConfig';

// run this to check the CODE and PROD config are readable and look right

loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema).then(console.log);

loadConfig('PROD', 'support', 'alarms-handler', ConfigSchema).then(console.log);
