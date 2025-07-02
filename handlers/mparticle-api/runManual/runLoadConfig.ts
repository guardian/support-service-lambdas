import { loadConfig } from '@modules/aws/appConfig';
import { ConfigSchema } from '../src/config';

// run this to check the CODE and PROD config are readable and look right

loadConfig('CODE', 'membership', 'mparticle-api', ConfigSchema).then(console.log);

loadConfig('PROD', 'membership', 'mparticle-api', ConfigSchema).then(console.log);
