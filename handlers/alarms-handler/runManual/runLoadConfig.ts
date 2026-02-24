import { loadConfig } from '@modules/aws/appConfig';
import { ConfigSchema } from '../src/configSchema';

// run this to check the CODE and PROD config are readable and look right
loadConfig('CODE', 'support', 'alarms-handler', ConfigSchema)
	.then(console.log)
	.catch(console.error);

loadConfig('PROD', 'support', 'alarms-handler', ConfigSchema)
	.then(console.log)
	.catch(console.error);
