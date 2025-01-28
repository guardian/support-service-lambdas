import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const benefitsListHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const format = event.queryStringParameters?.format;
	if (format !== 'html') {
		return getHttpResponse(getHtmlBody(), 'text/html');
	}
	return getHttpResponse(JSON.stringify(productBenefitMapping));
};

const getHttpResponse = (
	body: string,
	contentType?: string,
): Promise<APIGatewayProxyResult> => {
	return Promise.resolve({
		statusCode: 200,
		headers: {
			'Content-Type': contentType ?? 'application/json',
			'Cache-Control': 'max-age=60',
		},
		body,
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
				<h1>Product Benefits List</h1>
				<table>
				<tbody>
					<tr>
						<th>Product</th>
						<th>Benefits</th>
					${Object.entries(productBenefitMapping)
						.map(
							([key, value]) =>
								`<tr><td>${key}</td><td>${value.join(',')}</td></tr>`,
						)
						.join('')}
				</table>
			</body>
		</html>
	`;
};
