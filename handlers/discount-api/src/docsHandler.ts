import { getSingleOrThrow } from '@modules/arrayFunctions';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import type { GenericProductCatalog } from '@modules/product-catalog/productCatalogSchema';
import { logger } from '@modules/routing/logger';
import type { Stage } from '@modules/stage';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { Discount } from './discountTypes';
import { aaa } from './eligibilityChecker';
import { ProductToDiscountMapping } from './productToDiscountMapping';

export async function docsHandler(
	stage: Stage,
): Promise<APIGatewayProxyResult> {
	logger.log('showing docs');
	const discountForPrpId: Record<string, Discount> =
		ProductToDiscountMapping(stage);
	const catalog: GenericProductCatalog = await getProductCatalogFromApi(stage);
	const findPlan = (prpId: string) =>
		getSingleOrThrow(
			Object.entries(catalog).flatMap(([friendlyName, value]) =>
				Object.entries(value.ratePlans).flatMap(([rpFriendlyName, prp]) =>
					prp.id === prpId ? [[friendlyName, rpFriendlyName]] : [],
				),
			),
			(e) => new Error(`need a single rate plan ${e}`),
		);

	const rows = Object.entries(discountForPrpId)
		.map(([prpId, discount]) => [
			...findPlan(prpId),
			discount.name,
			discount.eligibilityCheckForRatePlan,
			aaa[discount.eligibilityCheckForRatePlan]
				.map((item) => item.name)
				.join('<br>'),
		])
		.sort();
	return {
		body: render(
			'Discount list - ' + stage,
			'product,plan,discount,eligibility,subchecks'.split(','),
			rows,
		),
		headers: {
			'Content-Type': 'text/html',
			'Cache-Control': 'max-age=60',
		},
		statusCode: 200,
	};
}

const render = (title: string, headers: string[], rows: string[][]): string => {
	return `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<title>${title}</title>
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
				<h1>${title}</h1>
				<table>
				<tbody>
					<tr>
					  ${'\n' + headers.map((item) => `  <th>${item}</th>\n`).join('')}
					</tr>
						${
							'\n' +
							rows
								.map(
									(cells) =>
										`<tr>\n` +
										cells.map((item) => `  <td>${item}</td>\n`).join('') +
										`</tr>\n`,
								)
								.join('')
						}
				</table>
			</body>
		</html>
	`;
};
