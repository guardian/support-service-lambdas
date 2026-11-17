import { serve } from '@hono/node-server';
import { logger } from '@modules/logger/logger';
import { app } from '../src/cancel';

serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 8787 }, (info) => {
	logger.log(`Cancellation API: http://localhost:${info.port}/docs`);
});
