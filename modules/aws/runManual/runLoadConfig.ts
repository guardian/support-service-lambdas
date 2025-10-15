import { z } from 'zod';
import { loadAccountIds, loadConfig } from '@modules/aws/appConfig';

// by making it "any", it will not strip out any unknown keys, making it useful to have a look at some config for an app
export const schema = z.any();

export type SchemaType = z.infer<typeof schema>;

loadConfig('CODE', 'support', 'alarms-handler', schema).then(console.log);

loadAccountIds().then(console.log);
