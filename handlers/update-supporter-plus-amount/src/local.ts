import { execFile } from 'node:child_process';
import { serve } from '@hono/node-server';
import { updateSupporterPlusAmountApp } from './index';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? '8787');
const docsUrl = `http://${host}:${port}/docs`;

const server = serve(
	{
		fetch: updateSupporterPlusAmountApp.fetch,
		hostname: host,
		port,
	},
	() => {
		console.log(`Local server running on ${docsUrl}`);
		execFile('open', [docsUrl], (error) => {
			if (error) {
				console.log(`Failed to open browser automatically: ${error.message}`);
			}
		});
	},
);

const shutdown = () => {
	server.close();
	process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
