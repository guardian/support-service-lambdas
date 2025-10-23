import { productBenefitMapping } from '@modules/product-benefits/productBenefit';
import { getCustomerFacingName } from '@modules/product-catalog/productCatalog';
import { zuoraCatalogToProductKey } from '@modules/product-catalog/zuoraToProductNameMappings';
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

export function getZuoraCatalogName(productKey: unknown): string {
    return (
        Object.entries(zuoraCatalogToProductKey).find(
            ([, value]) => value === productKey,
        )?.[0] ?? '** Not in Zuora **'
    );
}

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
						<th>Product Catalog Key</th>
						<th>Zuora Catalog Name</th>
						<th>Customer Facing Name</th>
						<th>Benefits</th>
						${Object.entries(productBenefitMapping)
							.sort(([key1], [key2]) => key1.localeCompare(key2))
							.map(
								([key, value]) =>
									`<tr>` +
									`<td>${key}</td>` +
									`<td>${getZuoraCatalogName(key)}</td>` +
									`<td>${getCustomerFacingName(key)}</td>` +
									`<td>${value.sort().join(', ')}</td>` +
									`</tr>`,
							)
							.join('')}
				</table>
			</body>
		</html>
	`;
};
