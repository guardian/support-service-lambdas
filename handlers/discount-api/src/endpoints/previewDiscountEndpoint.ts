import type { Stage } from '../../../../modules/stage';
import { ValidationError } from '../errors';
import { checkDefined } from '../nullAndUndefined';
import { PreviewDiscount } from '../previewDiscount';
import { applyDiscountSchema } from '../requestSchema';

const previewDiscountResponse = (
	eligible: boolean,
	discountedPrice?: number,
) => {
	return {
		body: JSON.stringify({
			valid: eligible,
			discountedPrice,
		}),
		statusCode: 200,
	};
};

export const previewDiscountEndpoint = async (
	stage: Stage,
	body: string | null,
) => {
	const applyDiscountBody = applyDiscountSchema.parse(
		JSON.parse(checkDefined(body, 'No body was provided')),
	);
	const preview = await PreviewDiscount.create(stage);
	try {
		const discountedPrice =
			await preview.getDiscountPricePreview(applyDiscountBody);
		return previewDiscountResponse(true, discountedPrice);
	} catch (error) {
		if (error instanceof ValidationError) {
			console.log(`Validation failure: ${error.message}`);
			return previewDiscountResponse(false);
		} else {
			throw error;
		}
	}
};
