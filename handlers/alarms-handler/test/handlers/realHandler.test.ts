/**
 * @group integration
 */

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsConfig } from '@modules/aws/config';
import { logger } from '@modules/routing/logger';
import type { GroupType } from '@modules/routing/requestLogger';
import { groupSchema } from '@modules/routing/requestLogger';

test('todo single exec', async () => {
	const bucket = 'gu-reader-revenue-logs';
	const key = 'CODE/alarms-handler/1777275997575.json';
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
	});
	const response = await new S3Client(awsConfig).send(command);
	if (!response.Body) {
		throw new Error('Expected S3 object body');
	}

	const body = await response.Body.transformToString();
	const parsedBody: GroupType = groupSchema.parse(JSON.parse(body));
	logger.log(parsedBody);
});
