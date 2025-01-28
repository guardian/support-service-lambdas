import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const benefitsListHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const format = event.queryStringParameters?.format;
	if (format !== 'html') {
		return Promise.resolve({
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html',
			},
			body: getHtmlBody(),
		});
	}
	return Promise.resolve({
		statusCode: 200,
		body: JSON.stringify(productBenefitMapping),
	});
};

const getHtmlBody = (): string => {
	return `
		<!DOCTYPE html>
		<html>
			<head>
				<title>Benefits List</title>
			</head>
			<body>
				<h1>Benefits List</h1>
				<ul>
					${Object.entries(productBenefitMapping)
						.map(([key, value]) => `<li>${key}: ${value.join(',')}</li>`)
						.join('')}
				</ul>
			</body>
		</html>
	`;
};
