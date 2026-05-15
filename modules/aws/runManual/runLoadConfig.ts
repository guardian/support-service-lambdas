import { loadConfig } from '@modules/aws/appConfig';
import { z } from 'zod';

// by making it "any", it will not strip out any unknown keys, making it useful to have a look at some config for an app
export const schema = z.any();

export type SchemaType = z.infer<typeof schema>;

loadConfig('CODE', 'support', 'alarms-handler', schema).then(console.log);
