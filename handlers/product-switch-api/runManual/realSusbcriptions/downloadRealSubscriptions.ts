import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { GetQueryResultsCommandOutput } from '@aws-sdk/client-cloudwatch-logs';
import {
	CloudWatchLogsClient,
	GetQueryResultsCommand,
	StartQueryCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { fromIni } from '@aws-sdk/credential-providers';
import { logGroupName, subscriptionsDir } from './config';

/*
 * this script is used to prepare for running testRealSubscriptions.ts.  It
 *
 * - downloads all the subscriptions used by the lambda over the past two weeks,
 * - redacts the relevant ids and numbers, and
 * - writes them as json files to the directory specified in config.ts
 *
 * First prepare AWS credentials, then run this script.
 */

function randomSubscription(): string {
	return 'A-S999' + Math.floor(Math.random() * 100000);
}

function randomHex32(): string {
	const chars = '0123456789abcdef';
	return (
		'999' +
		Array.from(
			{ length: 29 },
			() => chars[Math.floor(Math.random() * chars.length)],
		).join('')
	);
}

function randomChargeNum(): string {
	return 'C-999' + Math.floor(Math.random() * 100000);
}

function randomAccount(): string {
	return 'A999' + Math.floor(Math.random() * 100000);
}

interface RatePlanCharge {
	id?: string;
	number?: string;
	[key: string]: unknown;
}

interface RatePlan {
	id?: string;
	ratePlanCharges?: RatePlanCharge[];
	[key: string]: unknown;
}

interface RedactableSubscription {
	id?: string;
	accountNumber?: string;
	subscriptionNumber?: string;
	ratePlans?: RatePlan[];
	[key: string]: unknown;
}

function redactSubscription(obj: unknown): unknown {
	if (typeof obj !== 'object' || obj === null) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map(redactSubscription);
	}

	const result = {
		...(obj as Record<string, unknown>),
	} as RedactableSubscription;

	if ('id' in result) {
		result.id = randomHex32();
	}
	if ('accountNumber' in result) {
		result.accountNumber = randomAccount();
	}
	if ('subscriptionNumber' in result) {
		result.subscriptionNumber = randomSubscription();
	}

	if ('ratePlans' in result && Array.isArray(result.ratePlans)) {
		result.ratePlans = result.ratePlans.map((plan) => {
			const newPlan = { ...plan };
			if ('id' in newPlan) {
				newPlan.id = randomHex32();
			}

			if (
				'ratePlanCharges' in newPlan &&
				Array.isArray(newPlan.ratePlanCharges)
			) {
				newPlan.ratePlanCharges = newPlan.ratePlanCharges.map(
					(charge): RatePlanCharge => ({
						...charge,
						id: randomHex32(),
						number: randomChargeNum(),
					}),
				);
			}
			return newPlan;
		});
	}

	return result;
}

function extractJsonFromLog(entry: string): string | null {
	const lines = entry.split('\n');
	const startIndex = lines.findIndex((line) => line === '{');
	if (startIndex === -1) {
		return null;
	}

	const endIndex = lines.findIndex((line, i) => i > startIndex && line === '}');
	if (endIndex === -1) {
		return null;
	}

	return lines.slice(startIndex, endIndex + 1).join('\n');
}

function fixBareKeys(jsonStr: string): string {
	return jsonStr.replace(/(\s+)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
}

async function main() {
	if (!subscriptionsDir.startsWith('/')) {
		console.log(
			'do not write to a relative path, make sure it is outside of any git roots',
		);
		process.exit(1);
	}

	if (!existsSync(subscriptionsDir)) {
		mkdirSync(subscriptionsDir, { recursive: false });
	}

	const region = 'eu-west-1';
	const queryLookbackDays = 14;

	const client = new CloudWatchLogsClient({
		region,
		credentials: fromIni({ profile: 'membership' }),
	});

	const startTime =
		Math.floor(Date.now() / 1000) - queryLookbackDays * 24 * 3600;
	const endTime = Math.floor(Date.now() / 1000);

	const query = `fields @timestamp, @message
 | filter @message like /TRACE HTTP _ZuoraClient EXIT SHORT_ARGS/
 | filter @message like /path: v1\\/subscriptions\\/A-S[0-9]+/
 | filter @message like /method: GET/
 | sort @timestamp desc
 | limit 10000`;

	console.log(`Starting CloudWatch query on group ${logGroupName} ...`);

	const startQueryResp = await client.send(
		new StartQueryCommand({
			logGroupName,
			startTime,
			endTime,
			queryString: query,
		}),
	);

	const queryId = startQueryResp.queryId!;
	let status = 'Running';
	let results: Array<Record<string, string>> = [];

	while (status === 'Running' || status === 'Scheduled') {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const resp: GetQueryResultsCommandOutput = await client.send(
			new GetQueryResultsCommand({ queryId }),
		);
		status = resp.status!;

		if (status === 'Complete' && resp.results) {
			results = resp.results.map((row) =>
				Object.fromEntries(
					row.map((field) => [field.field ?? '', field.value ?? '']),
				),
			);
		}
	}

	console.log(`Query ${queryId} complete, ${results.length} results`);

	let count = 0;

	for (const fields of results) {
		const message = fields['@message'];
		if (!message) {
			continue;
		}

		console.log('message: ' + message);

		const jsonStr = extractJsonFromLog(message);
		if (!jsonStr) {
			continue;
		}

		console.log('    jsonStr: ' + jsonStr);

		const fixedJson = fixBareKeys(jsonStr);
		console.log('    fixedJson: ' + fixedJson);

		try {
			const parsedJson: unknown = JSON.parse(fixedJson);
			console.log('    parseResult: success');

			const redacted = redactSubscription(parsedJson);
			const timestamp = fields['@timestamp']!.replace(/ /g, 'T');
			const fileName = `subscriptionRedacted-${timestamp}.json`;

			const outFile = join(subscriptionsDir, fileName);
			const content = JSON.stringify(redacted, null, 2);

			writeFileSync(outFile, content);
			console.log('    redacted.spaces2: ' + content);
			console.log(`    Written ${fileName}`);
			count++;
		} catch (error) {
			console.log('    parseResult: failed', error);
		}
	}

	console.log(
		`Finished! ${count} files written out of potential ${results.length}.`,
	);
}

main().then(console.log).catch(console.error);
