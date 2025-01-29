import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const benefitsListHandler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const returnHtml = event.headers.accept?.includes('text/html');
	if (returnHtml) {
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
		<html lang="en">
			<head>
				<title>Product Benefits List</title>
				<meta name="robots" content="noindex">
				<style>
					table {
						border-collapse: collapse;
					}
					th, td {
						border: 1px solid black;
						padding: 8px;
						text-align: left;
					}
					th {
						background-color: #CCC;
					}
					tr:nth-child(odd) {
 						background-color: #EEE;
					}
				</style>
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
									`<tr><td>${key}</td><td>${value.join(', ')}</td></tr>`,
							)
							.join('')}
				</table>
			</body>
		</html>
	`;
};
