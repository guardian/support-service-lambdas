import type { SQSEvent } from 'aws-lambda';

/**
 * Local invocation script for the imovo-voucher-api handler.
 * Mocks the i-movo API (geo-restricted to UK) so you can test the full flow from anywhere.
 *
 * Usage:
 *   pnpm run-local              # mock mode (default) - simulates i-movo API
 *   pnpm run-local -- --live    # live mode - calls real i-movo API (requires UK IP)
 */

process.env.AWS_PROFILE = 'membership';
process.env.AWS_REGION = 'eu-west-1';
process.env.STAGE = 'CODE';
process.env.IMOVO_API_BASE_URL = 'https://imovocoreapi.tstpaypoint.services';
process.env.VOUCHER_TABLE_NAME = 'imovo-voucher-api-vouchers-CODE';

const isLive = process.argv.includes('--live');

if (!isLive) {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async (input, init) => {
		const url = typeof input === 'string' ? input : 'unknown';

		if (url.includes('imovocoreapi')) {
			console.log(`[MOCK] i-movo API call intercepted: ${url}`);
			const body =
				typeof init?.body === 'string' ? init.body : 'non-string body';
			console.log(`[MOCK] Request body: ${body}`);
			return new Response(
				JSON.stringify({
					voucherCode: 'MOCK-VOUCHER-ABC123',
					expiryDate: '2026-12-31T23:59:59Z',
					balance: 5.0,
					message: 'Success',
					successfulRequest: true,
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } },
			);
		}

		return originalFetch(input, init);
	};
	console.log('[MOCK] i-movo API mocked (use --live to call real API)\n');
}

const testEvent: SQSEvent = {
	Records: [
		{
			messageId: 'local-test-001',
			receiptHandle: 'local-receipt',
			body: JSON.stringify({
				email: 'test@theguardian.com',
				identityId: 'local-test-user-123',
				voucherType: 'DIGITAL_REWARD',
			}),
			attributes: {
				ApproximateReceiveCount: '1',
				SentTimestamp: Date.now().toString(),
				SenderId: 'local',
				ApproximateFirstReceiveTimestamp: Date.now().toString(),
			},
			messageAttributes: {},
			md5OfBody: '',
			eventSource: 'aws:sqs',
			eventSourceARN: 'arn:aws:sqs:eu-west-1:000000000000:local-test',
			awsRegion: 'eu-west-1',
		},
	],
};

async function main() {
	const { handler } = await import('./index');

	console.log('--- Running imovo-voucher-api locally ---\n');

	try {
		await handler(testEvent);
		console.log('\n--- Handler completed successfully ---');
	} catch (error) {
		console.error('\n--- Handler failed ---');
		console.error(error);
		process.exitCode = 1;
	}
}

void main();
