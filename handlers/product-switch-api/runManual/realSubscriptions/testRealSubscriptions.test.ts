/**
 * @group integration
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '@modules/routing/logger';
import type { ZuoraSubscription } from '@modules/zuora/types';
import { zuoraSubscriptionSchema } from '@modules/zuora/types';
import dayjs from 'dayjs';
import zuoraCatalogFixture from '../../../../modules/zuora-catalog/test/fixtures/catalog-prod.json';
import { getSinglePlanFlattenedSubscriptionOrThrow } from '../../src/guardianSubscription/getSinglePlanFlattenedSubscriptionOrThrow';
import { GuardianSubscriptionParser } from '../../src/guardianSubscription/guardianSubscriptionParser';
import { SubscriptionFilter } from '../../src/guardianSubscription/subscriptionFilter';
import { productCatalog } from '../../test/productCatalogFixture';
import { subscriptionsDir } from './config';

test('processes all PROD subscription files successfully', () => {
	const files = fs.readdirSync(subscriptionsDir);
	const matchingFiles = files.filter((file: string) =>
		/^subscriptionRedacted-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\.json$/.test(
			file,
		),
	);

	expect(matchingFiles.length).toBeGreaterThan(0);

	const guardianSubscriptionParser = new GuardianSubscriptionParser(
		zuoraCatalogFixture,
		productCatalog,
	);

	matchingFiles.forEach((file: string) => {
		const filePath = path.join(subscriptionsDir, file);

		try {
			// file names are like subscriptionRedacted-2026-02-03T08:21:22.946.json
			const dateMatch = file.match(/subscriptionRedacted-(\d{4}-\d{2}-\d{2})/);
			if (!dateMatch) {
				throw new Error(`Could not extract date from filename: ${file}`);
			}
			const callDate = dayjs(dateMatch[1]);

			const subscriptionData: ZuoraSubscription = zuoraSubscriptionSchema.parse(
				JSON.parse(fs.readFileSync(filePath, 'utf-8')),
			);
			const zuoraSubscription = zuoraSubscriptionSchema.parse(subscriptionData);
			const guardianSubscription =
				guardianSubscriptionParser.toGuardianSubscription(zuoraSubscription);
			const filter =
				SubscriptionFilter.activeNonEndedSubscriptionFilter(callDate);
			const filteredSubscription =
				filter.filterSubscription(guardianSubscription);
			const flattenedSubscription =
				getSinglePlanFlattenedSubscriptionOrThrow(filteredSubscription);

			expect(flattenedSubscription).toBeDefined();
			expect(flattenedSubscription.ratePlan).toBeDefined();
			logger.log(`Successfully processed ${file}`);
		} catch (error) {
			logger.log(`Failed to process ${file}`, { error });
			throw error;
		}
	});
});
