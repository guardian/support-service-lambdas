import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const benefitsListHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify(productBenefitMapping),
	});
};
