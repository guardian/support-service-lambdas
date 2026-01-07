/**
 * CLI command for running bulk Identity sync from a JSON file.
 *
 * Usage:
 *   pnpm runBulkSync CODE ./subscriptions-to-fix.json
 *   pnpm runBulkSync PROD ./subscriptions-to-fix.json --dry-run
 *
 * Input file format (JSON array):
 * [
 *   {
 *     "subscriptionId": "2c92a0fd60203d27016043ddc78f17c7",
 *     "subscriptionName": "A-S00248168",
 *     "zuoraAccountId": "2c92a0fd565401c901566c9d29155b17",
 *     "identityId": "123456789",
 *     "sfContactId": "0030J000020wMWpQAM",
 *     "sfAccountId": "0010J00001lRwTCQA0",
 *     "email": "user@example.com"
 *   },
 *   ...
 * ]
 */

import type { Stage } from '@modules/stage';
import { runBulkSyncFromFile } from './index';

const main = async () => {
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.log('Usage: pnpm runBulkSync <stage> <input-file.json> [--dry-run]');
		console.log('');
		console.log('Arguments:');
		console.log('  stage          CODE or PROD');
		console.log('  input-file     Path to JSON file with subscriptions to sync');
		console.log('  --dry-run      Optional: log what would be done without making changes');
		console.log('');
		console.log('Example:');
		console.log('  pnpm runBulkSync CODE ./subscriptions-to-fix.json --dry-run');
		process.exit(1);
	}

	const stageArg = args[0];
	if (stageArg !== 'CODE' && stageArg !== 'PROD') {
		console.error(`Invalid stage: ${stageArg}. Must be CODE or PROD.`);
		process.exit(1);
	}
	const stage: Stage = stageArg;

	const inputFile = args[1];
	if (!inputFile) {
		console.error('Input file is required');
		process.exit(1);
	}
	const dryRun = args.includes('--dry-run');

	console.log(`Starting bulk Identity sync...`);
	console.log(`  Stage: ${stage}`);
	console.log(`  Input file: ${inputFile}`);
	console.log(`  Dry run: ${dryRun}`);
	console.log('');

	try {
		const result = await runBulkSyncFromFile(stage, inputFile, dryRun);

		console.log('');
		console.log('=== BULK SYNC RESULTS ===');
		console.log(`Total processed: ${result.totalProcessed}`);
		console.log(`Successful: ${result.successful}`);
		console.log(`Failed: ${result.failed}`);
		console.log(`Dry run: ${result.dryRun}`);

		if (result.failed > 0) {
			console.log('');
			console.log('Failed subscriptions:');
			result.results
				.filter((r) => !r.success)
				.forEach((r) => {
					console.log(`  - ${r.subscriptionName}: ${r.error}`);
				});
		}

		// Write results to file
		const outputFile = inputFile.replace('.json', '-results.json');
		const fs = await import('fs');
		fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
		console.log('');
		console.log(`Results written to: ${outputFile}`);

		process.exit(result.failed > 0 ? 1 : 0);
	} catch (error) {
		console.error('Bulk sync failed:', error);
		process.exit(1);
	}
};

void main();
