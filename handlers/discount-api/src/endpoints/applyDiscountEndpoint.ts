import type { Stage } from '../../../../modules/stage';
import { DiscountApplicator } from '../discountApplicator';
import { ValidationError } from '../errors';
import { checkDefined } from '../nullAndUndefined';
import { applyDiscountSchema } from '../requestSchema';

export const applyDiscountEndpoint = async (
	stage: Stage,
	body: string | null,
) => {
	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(body, 'No body was provided')),
	);
	const discountApplicator = await DiscountApplicator.create(stage);
	await discountApplicator.applyDiscount(applyDiscountBody);
	return {
		body: 'Success',
		statusCode: 200,
	};
};

const checkEligibilityResponse = (eligible: boolean) => {
	return {
		body: JSON.stringify({
			valid: eligible,
		}),
		statusCode: 200,
	};
};

export const checkEligibilityEndpoint = async (
	stage: Stage,
	body: string | null,
) => {
	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(body, 'No body was provided')),
	);
	const discountApplicator = await DiscountApplicator.create(stage);
	try {
		await discountApplicator.checkEligibility(applyDiscountBody);
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
			return checkEligibilityResponse(false);
		} else {
			throw error;
		}
	}
	return checkEligibilityResponse(true);
};
