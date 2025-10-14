import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { DynamoDBStreamEvent, Handler } from 'aws-lambda';

const updateSupporterProductData = (
	stage: Stage,
	event: DynamoDBStreamEvent,
) => {
	logger.log(
		'info',
		`Updated supporter product data for stage ${stage} with event ${JSON.stringify(event)}`,
	);
	return Promise.resolve();
};
export const handler: Handler = async (event: DynamoDBStreamEvent) => {
	console.log(`Input is ${JSON.stringify(event, null, 2)}`);
	const stage = stageFromEnvironment();
	await updateSupporterProductData(stage, event);
};
