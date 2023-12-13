import type { Stage } from '../../../../modules/stage';
import { DiscountApplicator } from '../discountApplicator';
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
