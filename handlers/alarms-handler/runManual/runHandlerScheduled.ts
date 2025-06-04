import { handler } from '../src/indexScheduled';
import * as fs from 'node:fs';

/**
 * Lets you exercise the side effects locally
 * Populate /etc/gu/alarms.env with something like the following content before running.
 * Get janus creds for membership
 * you might have to comment out the cross account clients, as it doesn't yet fall back to janus (profile) credentials accordingly

GROWTH_WEBHOOK=growth
PLATFORM_WEBHOOK=platform
PORTFOLIO_WEBHOOK=portfolio
SRE_WEBHOOK=sre
VALUE_WEBHOOK=value
MOBILE_AWS_ACCOUNT_ID=...
MOBILE_ROLE_ARN=arn:aws:iam::...:role/mobile-purchases-CODE-MembershipCloudwatchRole-LDvh4yn14N9H
TARGETING_AWS_ACCOUNT_ID=...
TARGETING_ROLE_ARN=arn:aws:iam::...:role/targeting-platform-MembershipListTagsRole08BFF357-BPKWkciqnQLr

 */
const main = async () => {
	process.env['STAGE'] = 'CODE';
	const data = fs.readFileSync('/etc/gu/alarms.env', 'utf-8');
	const loadedEnv = Object.fromEntries(
		data.split('\n').flatMap((line) => {
			if (line.startsWith('//')) {
				console.log('skipping comment', line);
				return [];
			}
			const sepIndex = line.indexOf('=');
			return [[line.slice(0, sepIndex), line.slice(sepIndex + 1)]];
		}),
	);
	console.log('env vars to be loaded: ', loadedEnv);
	Object.entries(loadedEnv).forEach(
		([key, value]) => (process.env[key] = value),
	);
	await handler();
};

main().then(console.log);
