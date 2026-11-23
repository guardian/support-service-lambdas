import { serveApiLocally } from '@modules/routing/serveApiLocally';
import { api, buildCancellationServices, configSchema } from '../src/cancel';

void serveApiLocally(configSchema, api, buildCancellationServices);
