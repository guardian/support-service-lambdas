import { loadConfig } from '@modules/aws/appConfig';
import { ConfigSchema } from '../src/services/config';

// run this to check the CODE and PROD config are readable and look right

loadConfig('CODE', 'support', 'mparticle-api', ConfigSchema).then(console.log);

loadConfig('PROD', 'support', 'mparticle-api', ConfigSchema).then(console.log);
