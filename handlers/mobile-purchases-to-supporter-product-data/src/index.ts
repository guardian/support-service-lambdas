import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import { stageFromEnvironment } from '@modules/stage';
import type { DynamoDBRecord, Handler } from 'aws-lambda';

type InputEvent = {
	detail: DynamoDBRecord;
};
const updateSupporterProductData = (stage: Stage, event: InputEvent) => {
	logger.log(
		'info',
		`Updated supporter product data for stage ${stage} with event ${JSON.stringify(event)}`,
	);
	return Promise.resolve();
};
export const handler: Handler = async (event: InputEvent) => {
	console.log(`Input is ${JSON.stringify(event, null, 2)}`);
	const stage = stageFromEnvironment();
	console.log(`Event type is ${event.detail.eventName}`);
	await updateSupporterProductData(stage, event);
};
