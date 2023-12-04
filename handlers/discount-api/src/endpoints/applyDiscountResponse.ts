import type { APIGatewayProxyEvent } from 'aws-lambda';
import type { Stage } from '../../../../modules/stage';
import { DiscountApplicator } from '../discountApplicator';
import { checkDefined } from '../nullAndUndefined';
import { applyDiscountSchema } from '../requestSchema';

export const applyDiscountResponse = async (
	stage: Stage,
	event: APIGatewayProxyEvent,
) => {
	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(event.body, 'No body was provided')),
	);
	const discountApplicator = await DiscountApplicator.create(stage);
	await discountApplicator.applyDiscount(applyDiscountBody);
	return {
		body: 'Success',
		statusCode: 200,
	};
};

export const checkEligibilityResponse = async (
	stage: Stage,
	event: APIGatewayProxyEvent,
) => {
	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(event.body, 'No body was provided')),
	);
	const discountApplicator = await DiscountApplicator.create(stage);
	await discountApplicator.checkEligibility(applyDiscountBody);
	return {
		body: 'Success',
		statusCode: 200,
	};
};
